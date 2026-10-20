import {createHmac,timingSafeEqual} from "node:crypto";
import {prisma} from "@/lib/prisma";

export function otpHash(phone:string,otp:string,secret:string){return createHmac("sha256",secret).update(`${phone}:${otp}`).digest("hex")}
function matches(expected:string,actual:string){const a=Buffer.from(expected,"hex"),b=Buffer.from(actual,"hex");return a.length===b.length&&timingSafeEqual(a,b)}
export async function verifyOtp(phone:string,otp:string,secret:string,now=new Date()){const challenge=await prisma.otpChallenge.findUnique({where:{phone}});if(!challenge||challenge.expiresAt<=now||challenge.attempts>=5)return false;const good=matches(challenge.codeHash,otpHash(phone,otp,secret));if(!good){await prisma.otpChallenge.updateMany({where:{phone,expiresAt:{gt:now},attempts:{lt:5}},data:{attempts:{increment:1}}});return false}const consumed=await prisma.otpChallenge.deleteMany({where:{phone,codeHash:challenge.codeHash,expiresAt:{gt:now},attempts:{lt:5}}});return consumed.count===1}
