'use server';

import { db } from "@/lib/db";
import { users, accounts, type User, type NewUser } from "@/lib/db/schema/user";
import { eq, and } from "drizzle-orm";
import { Result, ResultType } from "@/lib/utils/result";
import { auth } from "@/auth";

// Server Action for handling authentication callback
export async function handleAuthCallback(data: {
    type: string;
    account?: any;
    user?: any;
}): Promise<ResultType<User>> {
    const { type, account, user } = data;

    if (type === 'oidc') {
        if (!account || !user) {
            return Result.fail("账户信息不完整");
        }
        return await handleGoogleData({ account, user });
    } else {
        return Result.fail("不支持的登录类型");
    }
}

// 处理Google登录数据
const handleGoogleData = async (data: { account: any; user: any }): Promise<ResultType<User>> => {
    try {
        const { account, user } = data;

        if (!account || !user) {
            return Result.fail("账户或用户信息不完整");
        }

        // 构造符合数据库schema的用户对象
        const userData: NewUser = {
            // 不设置 sid，让数据库使用默认的 nanoid() 生成
            name: user.name || user.email?.split("@")[0] || "Unknown User",
            avatar: user.image || null,
            email: user.email,
            totalPoints: 4,
            boundsPoints: 4,
            website: "geminiimagegenerator.online",
            lastLogin: new Date(),
        };

        // 检查用户是否已存在（通过email查找）
        const existingUser = await db
            .select()
            .from(users)
            .where(eq(users.email, user.email))
            .limit(1);

        let currentUser: User;

        if (existingUser.length > 0) {
            // 用户已存在，更新最后登录时间和其他信息
            const updatedUser = await db
                .update(users)
                .set({
                    lastLogin: new Date(),
                    updatedAt: new Date(),
                    // 更新头像和用户名（如果有变化）
                    avatar: user.image || existingUser[0].avatar,
                    name: user.name || existingUser[0].name,
                })
                .where(eq(users.email, user.email))
                .returning();

            currentUser = updatedUser[0];
        } else {
            // 新用户，插入数据库
            const newUser = await db.insert(users).values(userData).returning();
            currentUser = newUser[0];
        }

        // 处理账户信息
        const accountData = {
            userId: currentUser.sid,
            provider: account.provider,
            providerAccountId: account.providerAccountId,
            refresh_token: account.refresh_token || null,
            access_token: account.access_token,
            expires_at: account.expires_at,
            token_type: account.token_type,
            scope: account.scope,
            id_token: account.id_token,
            session_state: account.session_state || null,
        };

        // 检查账户是否已存在
        const existingAccount = await db
            .select()
            .from(accounts)
            .where(
                and(
                    eq(accounts.provider, account.provider),
                    eq(accounts.providerAccountId, account.providerAccountId)
                )
            )
            .limit(1);

        if (existingAccount.length > 0) {
            // 更新现有账户信息
            await db
                .update(accounts)
                .set({
                    ...accountData,
                    updatedAt: new Date(),
                })
                .where(
                    and(
                        eq(accounts.provider, account.provider),
                        eq(accounts.providerAccountId, account.providerAccountId)
                    )
                );
        } else {
            // 插入新账户信息
            await db.insert(accounts).values(accountData);
        }

        return Result.success(currentUser);
    } catch (error) {
        console.error("处理Google登录数据时出错:", error);
        return Result.fail("处理登录数据失败");
    }
};

export async function getUserInfo(): Promise<ResultType<User | null>> {
    try {
        // 验证用户登录状态
        const session = await auth();
        const uid = session?.user?.id;

        if (!session || !uid) {
            return Result.fail("用户未登录");
        }

        // 根据uid从数据库查询用户数据
        const userFromDb = await db
            .select()
            .from(users)
            .where(eq(users.sid, uid))
            .limit(1);

        if (userFromDb.length === 0) {
            return Result.fail("用户不存在");
        }

        const user = userFromDb[0];

        return Result.success(user);
    } catch (error) {
        console.error("获取用户信息失败:", error);
        const errorMsg = error instanceof Error ? error.message : "获取用户信息失败";
        return Result.fail(errorMsg);
    }
}