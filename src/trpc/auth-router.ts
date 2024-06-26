import { authCredentialsValidator } from "../lib/validator";
import { publicProcedure, router } from "./trpc";
import { z } from "zod";
import { getPayloadClient } from "../get-payload";
import { TRPCError } from "@trpc/server";

export const authRouter = router({
  createPayloadUser: publicProcedure
    .input(authCredentialsValidator)
    .mutation(async ({ input }) => {
      const { email, password } = input;
      const payload = await getPayloadClient();
      // check user already exists
      const { docs: users } = await payload.find({
        collection: "users",
        where: {
          email: {
            equals: email,
          },
        },
      });
      if (users.length !== 0) throw new TRPCError({ code: "CONFLICT" });

      //create payload user
      await payload.create({
        collection: "users",
        data: {
          email,
          password,
          role: "user",
        },
      });
      return {
        success: true,
        sendToEmail: email,
      };
    }),
  verifyEmail: publicProcedure
    .input(
      z.object({
        token: z.string(),
      })
    )
    .query(async ({ input }) => {
      const { token } = input;
      const payload = await getPayloadClient();
      const isVerified = await payload.verifyEmail({
        collection: "users",
        token,
      });
      if (!isVerified) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      return { success: true };
    }),
  signin: publicProcedure
    .input(authCredentialsValidator)
    .mutation(async ({ input, ctx }) => {
      const { email, password } = input;
      const { res } = ctx;
      const payload = await getPayloadClient();
      try {
        await payload.login({
          collection: "users",
          data: {
            email,
            password,
          },
          res,
        });
        return { success: true };
      } catch (err) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
    }),
});
