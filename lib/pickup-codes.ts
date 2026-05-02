import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;
const MAX_CREATE_ATTEMPTS = 5;

export function createPickupCodeValue() {
  let code = "";
  for (let index = 0; index < CODE_LENGTH; index += 1) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

export function getExpiryDate(base = new Date()) {
  const expires = new Date(base);
  expires.setDate(expires.getDate() + 7);
  return expires;
}

export async function createPickupCode() {
  for (let attempt = 0; attempt < MAX_CREATE_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.pickupCode.create({
        data: {
          code: createPickupCodeValue(),
          expiresAt: getExpiryDate()
        }
      });
    } catch (error) {
      if (!isUniqueConstraintError(error) || attempt === MAX_CREATE_ATTEMPTS - 1) {
        throw error;
      }
    }
  }

  throw new Error("Unable to create pickup code");
}

export async function findActivePickupCode(code: string) {
  const now = new Date();
  const record = await prisma.pickupCode.findUnique({
    where: { code },
    include: { tasks: taskListInclude }
  });

  if (!record || record.deletedAt || record.expiresAt <= now) {
    return null;
  }

  return prisma.pickupCode.update({
    where: { id: record.id },
    data: { lastAccessAt: now },
    include: { tasks: taskListInclude }
  });
}

export const taskListInclude = {
  orderBy: { createdAt: "desc" as const },
  include: { paragraphs: { orderBy: { index: "asc" as const } } }
};

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
