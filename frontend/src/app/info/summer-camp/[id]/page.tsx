import { redirect } from "next/navigation";

/** 旧路径重定向到合并后的通知详情页 */
export default async function SummerCampDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/info/notices/${id}`);
}
