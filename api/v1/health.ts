import tariffFile from "../../data/ica-tariffs-2021.json" with { type: "json" };
export default async function handler(req:any,res:any){
  if(req.method!=="GET"){res.setHeader("Allow","GET");return res.status(405).json({error:"Método no permitido"});}
  return res.status(200).json({ok:true,service:"hacienda-conecta",taxYear:2026,uvtValueCop:52374,tariffRulesLoaded:tariffFile.tariffs.length});
}
