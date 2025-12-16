const fs = require('fs');

function normEmail(e){return (e||'').toString().trim().toLowerCase();}
function normPhone(p){if(!p) return '';
  return p.toString().replace(/[^0-9]/g,'').replace(/^1/,'');
}

const intakes = JSON.parse(fs.readFileSync('intakes.json','utf8'));
const apptsRaw = JSON.parse(fs.readFileSync('appointments.json','utf8'));
const appointments = apptsRaw.appointments || [];

const intakeIds = new Set(intakes.map(i=>i.Id));
const intakeEmails = new Map();
const intakePhones = new Map();
intakes.forEach(i=>{
  const e = normEmail(i.ClientEmail);
  if(e) intakeEmails.set(e, (intakeEmails.get(e)||0)+1);
  const p = normPhone(i.ClientPhone || '');
  if(p) intakePhones.set(p, (intakePhones.get(p)||0)+1);
});

const apptsWithIntakeId = appointments.filter(a=>a.IntakeId);
const apptsWithIntakeMatching = appointments.filter(a=>a.IntakeId && intakeIds.has(a.IntakeId));

// match by email
let apptsEmailMatches = 0;
appointments.forEach(a=>{
  const e = normEmail(a.ClientEmail);
  if(e && intakeEmails.has(e)) {
    apptsEmailMatches++;
  }
});

// match by phone (normalize)
let apptsPhoneMatches = 0;
appointments.forEach(a=>{
  const p = normPhone(a.ClientPhone);
  if(p && intakePhones.has(p)) apptsPhoneMatches++;
});

// count unique intakes that appear in appointments via IntakeId
const uniqueIntakeIdsInAppts = new Set(apptsWithIntakeMatching.map(a=>a.IntakeId));

console.log('Total intakes:', intakes.length);
console.log('Total appointments:', appointments.length);
console.log('Appointments with non-null IntakeId:', apptsWithIntakeId.length);
console.log('Appointments with IntakeId matching an intake:', apptsWithIntakeMatching.length);
console.log('Unique intakes referenced by appointments (via IntakeId):', uniqueIntakeIdsInAppts.size);
console.log('Appointments with ClientEmail matching an intake email:', apptsEmailMatches);
console.log('Appointments with ClientPhone matching an intake phone (digit-only):', apptsPhoneMatches);

const sample = appointments.slice(0,20).map(a=>({Id:a.Id,ClientEmail:a.ClientEmail,ClientPhone:a.ClientPhone,IntakeId:a.IntakeId}));
console.log('\nSample appointments (first 20):');
console.log(sample);
