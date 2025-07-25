import { Request, Response } from "express";
import { createHmac } from "crypto";
import { client } from "../../bot/index.js";
import { TextChannel, EmbedBuilder } from "discord.js";

const NOTIFICATION_CHANNEL_ID = process.env.VERCEL_NOTIFICATION_CHANNEL_ID!;

interface VercelWebhookPayload {
  type: string;
  id: string;
  createdAt: number;
  payload: {
    team?: {
      id: string;
    };
    user: {
      id: string;
    };
    deployment: {
      id: string;
      meta: Record<string, any>;
      url: string;
      name: string;
    };
    links: {
      deployment: string;
      project: string;
    };
    target: "production" | "staging" | null;
    project: {
      id: string;
    };
    plan: string;
    regions: string[];
  };
}

async function verifySignature(
  rawBody: Buffer,
  signature: string | string[] | undefined
): Promise<boolean> {
  const { VERCEL_INTEGRATION_SECRET } = process.env;

  if (typeof VERCEL_INTEGRATION_SECRET !== "string") {
    throw new Error("No integration secret found");
  }

  if (!signature || Array.isArray(signature)) {
    return false;
  }

  const bodySignature = createHmac("sha1", VERCEL_INTEGRATION_SECRET)
    .update(rawBody)
    .digest("hex");

  return bodySignature === signature;
}

export async function handleVercelWebhook(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const rawBody = req.body;
    const signature = req.headers["x-vercel-signature"];

    const isValid = await verifySignature(rawBody, signature);
    if (!isValid) {
      res.status(403).json({
        code: "invalid_signature",
        error: "signature didn't match",
      });
      return;
    }

    const json: VercelWebhookPayload = JSON.parse(rawBody.toString("utf-8"));

    const channel = client.channels.cache.get(
      NOTIFICATION_CHANNEL_ID
    ) as TextChannel;
    if (!channel) {
      console.error(`Channel ${NOTIFICATION_CHANNEL_ID} not found`);
      res.status(500).json({ error: "Notification channel not found" });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(json.payload.target === "production" ? 0x00ff00 : 0x0099ff)
      .setTitle(`🚀 Vercel Deployment ${json.type}`)
      .setDescription(
        `새로운 배포가 ${json.payload.target || "preview"} 환경에 생성되었습니다.`
      )
      .addFields({
        name: "프로젝트",
        value: json.payload.deployment.name,
        inline: true,
      })
      .setTimestamp(new Date(json.createdAt))
      .setFooter({ text: `Deployment ID: ${json.payload.deployment.id}` });

    await channel.send({ embeds: [embed] });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Vercel webhook error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
