import { createClient } from "@supabase/supabase-js";
const supabase = createClient("https://dvdpgllezrmttrknbcjq.supabase.co","sb_publishable_u8aF30AdRo_flW3qb-Z8sg_evTHk9Ry",{auth:{persistSession:false,autoRefreshToken:false}});
function method(res:any,allowed:string[]){res.setHeader("Allow",allowed.join(", "));return res.status(405).json({error:"Método no permitido"});}

export default async function handler(req:any,res:any){
  if(req.method!=="POST") return method(res,["POST"]);
  try{
    const body=typeof req.body==="string"?JSON.parse(req.body):req.body||{};
    const {data,error}=await supabase.rpc("calculate_reteica",{p_transactions:body.transactions||[],p_tax_year:Number(body.taxYear||2026)});
    if(error) return res.status(422).json({error:error.message});
    return res.status(200).json(data);
  }catch(e:any){return res.status(400).json({error:e.message||"Solicitud inválida"});}
}
