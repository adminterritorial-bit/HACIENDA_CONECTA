import tariffFile from "../../../../data/ica-tariffs-2021.json" with { type: "json" };
export default async function handler(req:any,res:any){
  if(req.method!=="GET"){res.setHeader("Allow","GET");return res.status(405).json({error:"Método no permitido"});}
  const ciiu=String(req.query?.ciiu||"");
  if(!/^\d{4}$/.test(ciiu)) return res.status(400).json({error:"CIIU inválido"});
  const item=(tariffFile.tariffs as any[]).find(x=>x.ciiu===ciiu);
  return item?res.status(200).json(item):res.status(404).json({error:"Tarifa no encontrada"});
}
