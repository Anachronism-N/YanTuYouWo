import { redirect } from "next/navigation";

/** 旧路径重定向到合并后的通知列表页 */
export default function PreAdmissionRedirect() {
  redirect("/info/notices?program_type=pre_admission");
}
