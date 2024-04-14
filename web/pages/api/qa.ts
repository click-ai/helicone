import { NextApiRequest, NextApiResponse } from "next";
import { supabaseServer } from "../../lib/supabaseServer";
import * as crypto from "crypto";
import OpenAI from "openai";
import { generateApiKey } from "generate-api-key";
import { Faker, en } from "@faker-js/faker";

const encoder = new TextEncoder();

export async function hashAuth(key: string): Promise<string> {
  key = `Bearer ${key}`;
  const hashedKey = await crypto.subtle.digest(
    { name: "SHA-256" },
    encoder.encode(key)
  );
  const uintArray = new Uint8Array(hashedKey);
  const byteArray = Array.from(uintArray);
  const hexCodes = byteArray.map((value) => {
    const hexCode = value.toString(16);
    const paddedHexCode = hexCode.padStart(2, "0");
    return paddedHexCode;
  });
  const res = hexCodes.join("");

  // drop unintArray and byteArray from memory
  uintArray.fill(0);
  byteArray.fill(0);

  return res;
}
async function generateAPIKey() {
  const apiKey = `sk-${generateApiKey({
    method: "base32",
    dashes: true,
  }).toString()}`.toLowerCase();
  return apiKey;
}
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  const { onboard = false } = req.query;

  const password = Math.random().toString(36).substring(7);
  const randomEmail = `${Math.random().toString(36).substring(7)}@example.com`;
  const user = await supabaseServer.auth.admin.createUser({
    email: randomEmail,
    password,
  });
  const result = await supabaseServer
    .from("organization")
    .insert({
      name: "My Organization",
      owner: user.data.user!.id,
      tier: "free",
      is_personal: true,
      has_onboarded: !onboard,
    })
    .select()
    .single();

  const apiKey = await generateAPIKey();
  await supabaseServer.from("helicone_api_keys").insert({
    api_key_hash: await hashAuth(apiKey),
    user_id: user.data.user!.id,
    api_key_name: "test key",
    organization_id: result.data!.id,
  });

  const openai = new OpenAI({
    apiKey: process.env.QA_OPENAI_API_KEY,
    baseURL: "https://helicone-3143-3579317e-hujr8nrb.onporter.run/v1",
    defaultHeaders: {
      "Helicone-Auth": `Bearer ${apiKey}`,
      "Helicone-OpenAI-API-Base": "https://cache-openai.useclickai.com/v1",
    },
  });
  const faker = new Faker({ locale: [en] });
  faker.seed(123);

  const userIds = Array.from({ length: 5 }).map(() => faker.string.uuid());

  const promises = Array.from({ length: 10 }).map(() =>
    openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "user", content: faker.lorem.paragraph({ min: 1, max: 3 }) },
      ],
      user: faker.helpers.arrayElement(userIds),
    })
  );

  await Promise.all(promises);

  await openai.chat.completions
    .create({
      model: "gpt-4-turbo-2024-04-09",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "What's in this image?" },
            {
              type: "image_url",
              image_url: {
                url: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg",
              },
            },
          ],
        },
      ],
      user: faker.helpers.arrayElement(userIds),
    })
    .then((res) => {
      console.log(res.choices[0].message);
    })
    .catch((err) => {
      console.error(err);
    });

  const { data, error } = await supabaseServer.auth.admin.generateLink({
    type: "magiclink",
    email: randomEmail,
    options: {
      redirectTo: "/welcome",
    },
  });
  if (error) {
    res.status(500).json(error.message);
  }

  res.status(201).redirect(data.properties!.action_link);
}
