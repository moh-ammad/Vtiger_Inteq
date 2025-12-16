const fs = require('fs');

function normEmail(e){return (e||'').toString().trim().toLowerCase();}
function normPhone(p){if(!p) return '';
  return p.toString().replace(/[^0-9]/g,'').replace(/^1/,'');
}
function normName(n){return (n||'').toString().trim().toLowerCase().replace(/[^a-z0-9 ]+/g,'').replace(/\s+/g,' ').trim();}

const MILLIS_DAY = 24*60*60*1000;
const DATE_WINDOW_DAYS = 7; // consider appointment within +/- this many days of intake submission

const intakes = JSON.parse(fs.readFileSync('intakes.json','utf8'));
const apptsRaw = JSON.parse(fs.readFileSync('appointments.json','utf8'));
const appointments = apptsRaw.appointments || [];

// Index appointments by IntakeId, email, phone
const apptsByIntake = new Map();
const apptsByEmail = new Map();
const apptsByPhone = new Map();

appointments.forEach(a=>{
  if(a.IntakeId) {
    const arr = apptsByIntake.get(a.IntakeId) || [];
    arr.push(a); apptsByIntake.set(a.IntakeId, arr);
  }
  const e = normEmail(a.ClientEmail);
  if(e) { const arr = apptsByEmail.get(e) || []; arr.push(a); apptsByEmail.set(e, arr); }
  const p = normPhone(a.ClientPhone);
  if(p) { const arr = apptsByPhone.get(p) || []; arr.push(a); apptsByPhone.set(p, arr); }
});

function nameTokens(name){return name.split(' ').filter(Boolean);} 
function nameOverlap(a,b){
  const ta = new Set(nameTokens(normName(a)));
  const tb = new Set(nameTokens(normName(b)));
  if(ta.size===0||tb.size===0) return 0;
  let common=0; for(const t of ta) if(tb.has(t)) common++;
  return common;
}

const results = [];
let counts = {totalIntakes:intakes.length, matchedByIntakeId:0, matchedByEmail:0, matchedByPhone:0, matchedByNameDate:0, unmatched:0};

intakes.forEach(intake=>{
  const intakeId = intake.Id;
  const intakeEmail = normEmail(intake.ClientEmail);
  const intakePhone = normPhone(intake.ClientPhone || '');
  const intakeName = normName(intake.ClientName || '');
  const intakeDate = intake.DateSubmitted || intake.DateCreated || intake.LastModified || 0;

  let matched = [];
  let matchTypes = new Set();

  // 1) direct IntakeId
  if(apptsByIntake.has(intakeId)){
    matched = matched.concat(apptsByIntake.get(intakeId));
    matchTypes.add('IntakeId');
  }

  // 2) email match
  if(matched.length===0 && intakeEmail && apptsByEmail.has(intakeEmail)){
    matched = matched.concat(apptsByEmail.get(intakeEmail));
    matchTypes.add('Email');
  }

  // 3) phone match
  if(matched.length===0 && intakePhone && apptsByPhone.has(intakePhone)){
    matched = matched.concat(apptsByPhone.get(intakePhone));
    matchTypes.add('Phone');
  }

  // 4) name + date proximity match (if still none)
  if(matched.length===0){
    const window = DATE_WINDOW_DAYS * MILLIS_DAY;
    const candidate = appointments.filter(a=>{
      const aDate = a.StartDate || 0;
      if(!aDate || !intakeDate) return false;
      if(Math.abs(aDate - intakeDate) > window) return false;
      // name overlap at least 1 token
      if(nameOverlap(a.ClientName||'', intake.ClientName||'')>=1) return true;
      // or email local-part matches name token
      const aEmailLocal = (a.ClientEmail||'').split('@')[0];
      if(aEmailLocal && intakeName && (intakeName.includes(aEmailLocal) || aEmailLocal.includes(intakeName))) return true;
      return false;
    });
    if(candidate.length>0){ matched = matched.concat(candidate); matchTypes.add('Name+Date'); }
  }

  if(matched.length===0) counts.unmatched++;
  else {
    if(matchTypes.has('IntakeId')) counts.matchedByIntakeId++;
    else if(matchTypes.has('Email')) counts.matchedByEmail++;
    else if(matchTypes.has('Phone')) counts.matchedByPhone++;
    else if(matchTypes.has('Name+Date')) counts.matchedByNameDate++;
  }

  results.push({
    IntakeId: intakeId,
    ClientName: intake.ClientName || '',
    ClientEmail: intake.ClientEmail || '',
    ClientPhone: intake.ClientPhone || '',
    IntakeDate: intake.DateSubmitted || intake.DateCreated || intake.LastModified || null,
    Matched: matched.length>0,
    MatchTypes: Array.from(matchTypes),
    MatchedAppointments: matched.map(a=>({Id:a.Id, StartDate:a.StartDate || null, ClientEmail:a.ClientEmail||'', ClientPhone:a.ClientPhone||''}))
  });
});

// write outputs
fs.writeFileSync('intake_matches.json', JSON.stringify({counts, results}, null, 2));

// CSV summary lines
const header = ['IntakeId','ClientName','ClientEmail','IntakeDate','Matched','MatchTypes','MatchedAppointmentIds'].join(',')+"\n";
const csv = results.map(r=>{
  const ids = r.MatchedAppointments.map(a=>a.Id).join('|');
  return [r.IntakeId, '"'+(r.ClientName||'').replace(/"/g,'""')+'"', r.ClientEmail, r.IntakeDate||'', r.Matched, '"'+r.MatchTypes.join('|')+'"', '"'+ids+'"'].join(',');
}).join('\n');
fs.writeFileSync('intake_matches.csv', header+csv);

console.log('Wrote intake_matches.json and intake_matches.csv');
console.log('Summary counts:');
console.log(counts);
