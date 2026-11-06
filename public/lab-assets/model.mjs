export const BASES=['mol%','wt%','molar ratio','mass ratio'];
export const NUMBERS=['loading','solutionConc','anneal','annealTime','thickness','conductivity','seebeck','temperature'];
export const FIELDS=['title','date','project','host','dopant','reference','status','sample','solvent','mixing','coating','coatingParams','substrate','atmosphere','lot','processNotes','measurement','notes','batchId','batchName'];
export function number(value){return value===''||value===null||value===undefined?null:Number(value);}
export function pf(record){const s=number(record.seebeck),c=number(record.conductivity),t=number(record.temperature);return s!==null&&c!==null&&t>0&&Number.isFinite(s)&&Number.isFinite(c)&&c>=0?c*s*s*1e-4:null;}
export function validate(raw){
  const r={};
  for(const k of FIELDS){r[k]=String(raw[k]??'').trim();if(r[k].length>10000)throw Error('单个文本字段过长。');}
  for(const k of ['title','date','host','dopant','reference'])if(!r[k])throw Error('请填写名称、日期、主体、掺杂剂与计算基准。');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(r.date)||!Number.isFinite(new Date(r.date).getTime())||new Date(r.date).toISOString().slice(0,10)!==r.date)throw Error('实验日期无效。');
  if(!BASES.includes(raw.basis))throw Error('掺杂单位无效。');r.basis=raw.basis;
  for(const k of NUMBERS){r[k]=number(raw[k]);if(r[k]!==null&&!Number.isFinite(r[k]))throw Error('数值字段必须是有限数字。');}
  if(r.loading===null||r.loading<0)throw Error('掺杂量需要填写大于或等于 0 的数值。');
  for(const k of ['solutionConc','annealTime','thickness','conductivity'])if(r[k]!==null&&r[k]<0)throw Error('浓度、时间、厚度和电导率不能为负。');
  if(r.temperature!==null&&r.temperature<=0)throw Error('测试温度需大于 0 K。');
  if(!['待测试','已完成','需复测'].includes(r.status))r.status='待测试';
  r.files=Array.isArray(raw.files)?raw.files:[];return r;
}
export function groupKey(r){return JSON.stringify([r.host.trim(),r.dopant.trim(),r.basis,r.reference.trim(),number(r.temperature)]);}
export function format(v,digits=4){return v===null||v===undefined||!Number.isFinite(Number(v))?'—':Number(v).toLocaleString('en-US',{maximumSignificantDigits:digits});}
export function csv(records){
  const keys=[['code','记录编号'],['date','日期'],['title','实验名称'],['project','课题系列'],['sample','样品编号'],['host','主体材料'],['dopant','掺杂剂'],['loading','掺杂量'],['basis','掺杂单位'],['reference','计算基准'],['status','状态'],['solvent','溶剂'],['solutionConc','主体溶液浓度(mg/mL)'],['mixing','混合条件'],['coating','制膜方式'],['coatingParams','制膜参数'],['substrate','基底电极'],['anneal','退火温度(°C)'],['annealTime','退火时间(min)'],['thickness','厚度(nm)'],['atmosphere','气氛'],['lot','批号'],['processNotes','工艺备注'],['temperature','测试温度(K)'],['measurement','测量方式'],['conductivity','电导率(S/cm)'],['seebeck','Seebeck(μV/K)'],['pf','计算PF(μW m^-1 K^-2)'],['notes','观察结论'],['attachments','附件文件名']];
  const cell=v=>{let s=String(v??'');if(/^[\s]*[=+@\-]/.test(s)&&!/^\s*-?\d+(\.\d+)?([eE][+-]?\d+)?\s*$/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
  keys.unshift(['batchId','批次ID'],['batchName','实验批次']);
  return '\ufeff'+[keys.map(k=>cell(k[1])).join(','),...records.map(r=>{const row={...r,pf:pf(r),attachments:(r.files||[]).map(f=>f.name).join('; ')};return keys.map(k=>cell(row[k[0]])).join(',');})].join('\r\n');
}
const ref='n(掺杂剂) / n(主体重复单元) × 100%';
const make=(n,host,dopant,loading,c,s,status,overrides={})=>({id:'demo-'+n,code:`DEMO-${String(n).padStart(3,'0')}`,date:`2026-10-${String(18+n).padStart(2,'0')}`,title:`${host} / ${dopant} · ${loading} mol%`,host,dopant,loading,basis:'mol%',reference:ref,conductivity:c,seebeck:s,temperature:300,status,project:'示例浓度梯度',sample:`示例-${n}a`,solvent:'示例溶剂（虚构）',solutionConc:10,coating:'旋涂',coatingParams:'仅用于界面演示',substrate:'玻璃 / Au（示例）',anneal:100,annealTime:10,thickness:80,atmosphere:'N₂（示例）',mixing:'示例条件',measurement:'示例：面内测量；所有数值均为虚构',notes:'这是虚构的界面演示记录，不代表真实材料性能，也不是实验配方建议。',files:[],...overrides});
export const DEMO=[make(8,'P3HT','F4TCNQ',15,0.34,92,'需复测'),make(7,'P3HT','F4TCNQ',10,0.82,118,'已完成'),make(6,'PBTTT','F4TCNQ',5,1.2,101,'已完成',{project:'示例材料对比'}),make(5,'P3HT','F4TCNQ',5,0.46,151,'已完成'),make(4,'P3HT','F4TCNQ',2,0.12,213,'已完成'),make(3,'P3HT','F4TCNQ',1,0.032,282,'已完成'),make(2,'P3HT','F4TCNQ',0,0.0002,418,'已完成'),make(1,'P3HT','F6TCNNQ',5,null,null,'待测试',{project:'示例掺杂剂对比'})];
