import {validate} from './model.mjs';
export const MAX_BATCH_ROWS=200;
export const ROW_FIELDS=['sample','loading','anneal','annealTime','conductivity','seebeck','temperature','notes'];
export function parseList(text,label,{optional=false}={}){
  if(!String(text).trim()){if(optional)return [''];throw Error(`请填写${label}。`);}
  return String(text).trim().split(/[,，;；\s]+/).map(token=>{
    if(!/^[+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(token)||!Number.isFinite(Number(token)))throw Error(`${label}中「${token}」不是有效的非负数字，请只填数值、不要带单位。`);
    return Number(token);
  });
}
export function generateRows({loadings,times='',mode='gradient',repeats=1,prefix='S'}){
  const ls=parseList(loadings,'掺杂量列表'),ts=parseList(times,'退火时间列表',{optional:true});
  const n=Number(repeats);if(!Number.isInteger(n)||n<1||n>10)throw Error('重复样品数需为 1–10 的整数。');
  if(!['gradient','paired','matrix'].includes(mode))throw Error('请选择有效的生成方式。');
  if(mode==='gradient'&&ts.length>1)throw Error('浓度梯度使用一个固定退火时间；多个时间请选择「全部组合」或「逐项配对」。');
  if(mode==='paired'&&ls.length!==ts.length&&ls.length!==1&&ts.length!==1)throw Error('逐项配对时两列数量需相同，或其中一列只填一个固定值。');
  const size=(mode==='matrix'?ls.length*ts.length:Math.max(ls.length,ts.length))*n;
  if(size>MAX_BATCH_ROWS)throw Error(`一次最多生成 ${MAX_BATCH_ROWS} 个样品，当前组合会产生 ${size} 个。`);
  const pairs=mode==='matrix'?ls.flatMap(l=>ts.map(t=>[l,t])):Array.from({length:Math.max(ls.length,ts.length)},(_,i)=>[ls[ls.length===1?0:i],ts[ts.length===1?0:i]]);
  const rows=[];for(const [loading,annealTime] of pairs)for(let i=0;i<n;i++)rows.push({sample:`${prefix.trim()||'S'}-${String(rows.length+1).padStart(3,'0')}`,loading,annealTime,anneal:'',conductivity:'',seebeck:'',temperature:'',notes:''});
  return rows;
}
export function parsePaste(text,prefix='S'){
  const lines=String(text).replace(/\r/g,'').split('\n').filter(l=>l.trim());
  if(lines[0]&&['掺杂量','loading'].includes(lines[0].split('\t')[0].trim()))lines.shift();
  if(!lines.length)throw Error('请粘贴至少一行样品数据。');if(lines.length>MAX_BATCH_ROWS)throw Error(`一次最多粘贴 ${MAX_BATCH_ROWS} 行。`);
  return lines.map((line,i)=>{const cells=line.split('\t');if(cells.length>5)throw Error(`第 ${i+1} 行超过 5 列，请按提示的列顺序粘贴。`);const row={sample:`${prefix.trim()||'S'}-${String(i+1).padStart(3,'0')}`,anneal:'',notes:''};for(const [j,key] of ['loading','annealTime','conductivity','seebeck','temperature'].entries()){const token=(cells[j]??'').trim();if(key==='loading'&&!token)throw Error(`第 ${i+1} 行缺少掺杂量。`);if(token&&!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(token))throw Error(`第 ${i+1} 行的 ${key} 需填写数字。`);row[key]=token===''?'':Number(token);if(token!==''&&(!Number.isFinite(row[key])||(key!=='seebeck'&&row[key]<0)))throw Error(`第 ${i+1} 行有无效或负数值。`);}return row;});
}
export function allocateCodes(existing,date,count){
  const used=new Set(existing.map(r=>r.code)),prefix='EXP-'+date.replaceAll('-','')+'-',codes=[];let n=1;
  while(codes.length<count){const code=prefix+String(n++).padStart(3,'0');if(!used.has(code)){used.add(code);codes.push(code);}}return codes;
}
export function prepareBatch(common,rows,{batchId,existing=[],codeDate=common.date,idFactory=()=>crypto.randomUUID(),now=new Date().toISOString()}={}){
  if(!rows.length)throw Error('请先生成或添加样品行。');if(rows.length>MAX_BATCH_ROWS)throw Error(`一次最多保存 ${MAX_BATCH_ROWS} 个样品。`);
  if(!String(common.batchName??'').trim())throw Error('请填写实验批次名称。');
  if(!batchId)throw Error('缺少批次编号，请重新打开批量记录。');
  const seen=new Set(),codes=allocateCodes(existing,codeDate,rows.length);
  return rows.map((row,i)=>{
    const sample=String(row.sample??'').trim();if(!sample)throw Error(`第 ${i+1} 行：请填写样品编号。`);if(seen.has(sample))throw Error(`第 ${i+1} 行：样品编号「${sample}」在本批次内重复。`);seen.add(sample);
    const raw={...common,sample,batchId,batchName:common.batchName,title:`${common.batchName.trim()} · ${sample}`,loading:row.loading,files:[]};
    for(const k of ['anneal','annealTime','temperature'])raw[k]=row[k]!==''&&row[k]!==null&&row[k]!==undefined?row[k]:common[k];
    for(const k of ['conductivity','seebeck'])raw[k]=row[k]??'';
    raw.notes=[common.notes,String(row.notes??'').trim()].filter(Boolean).join('\n');
    try{return {...validate(raw),id:idFactory(),code:codes[i],createdAt:now,updatedAt:now};}catch(err){throw Error(`第 ${i+1} 行（${sample}）：${err.message}`);}
  });
}
