import { NextApiRequest, NextApiResponse } from "next";
import { supabaseServer } from "../../lib/supabaseServer";

export type Tier = "free" | "pro" | "enterprise";

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
  const result = await supabaseServer.from("organization").insert([
    {
      name: "My Organization",
      owner: user.data.user!.id,
      tier: "free",
      is_personal: true,
      has_onboarded: !onboard,
    },
  ]);
  const { data, error } = await supabaseServer.auth.admin.generateLink({
    type: "magiclink",
    email: randomEmail,
  });
  if (error) {
    res.status(500).json(error.message);
  }
  res.status(201).redirect(data.properties!.action_link);
  // const orgs = await supabaseServer
  //   .from("organization")
  //   .select("*")
  //   .eq("soft_delete", false)
  //   .eq("owner", userId);

  // if (!orgs.data || orgs.data.length === 0) {
  //   const result = await supabaseServer.from("organization").insert([
  //     {
  //       name: "My Organization",
  //       owner: userId,
  //       tier: "free",
  //       is_personal: true,
  //     },
  //   ]);
  //   if (result.error) {
  //     res.status(500).json(result.error.message);
  //   } else {
  //     res.status(200).json("Added successfully");
  //   }
  // } else {
  //   res.status(201).json("Already exists");
  // }
}
