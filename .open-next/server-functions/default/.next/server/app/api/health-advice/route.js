(()=>{var a={};a.id=4249,a.ids=[4249],a.modules={261:a=>{"use strict";a.exports=require("next/dist/shared/lib/router/utils/app-paths")},3295:a=>{"use strict";a.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},10846:a=>{"use strict";a.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},19121:a=>{"use strict";a.exports=require("next/dist/server/app-render/action-async-storage.external.js")},23879:(a,b,c)=>{"use strict";c.d(b,{DA:()=>f,z_:()=>e});var d=c(59256);let e=d.Ik({session_id:d.Yj(),user_profile:d.Ik({experience_level:d.k5(["beginner","intermediate","advanced"]),min_increment_kg:d.ai().positive().optional(),preferred_rpe:d.ai().min(1).max(10).optional()}),whoop:d.Ik({recovery_score:d.ai().min(0).max(100).optional(),sleep_performance:d.ai().min(0).max(100).optional(),hrv_now_ms:d.ai().positive().optional(),hrv_baseline_ms:d.ai().positive().optional(),rhr_now_bpm:d.ai().positive().optional(),rhr_baseline_bpm:d.ai().positive().optional(),yesterday_strain:d.ai().min(0).max(21).optional()}).optional(),workout_plan:d.Ik({exercises:d.YO(d.Ik({exercise_id:d.Yj(),name:d.Yj(),tags:d.YO(d.k5(["strength","hypertrophy","endurance"])),sets:d.YO(d.Ik({set_id:d.Yj(),target_reps:d.ai().positive().optional().nullable(),target_weight_kg:d.ai().positive().optional().nullable(),target_rpe:d.ai().min(1).max(10).optional().nullable()}))}))}),prior_bests:d.Ik({by_exercise_id:d.g1(d.Yj(),d.Ik({best_total_volume_kg:d.ai().positive().optional().nullable(),best_e1rm_kg:d.ai().positive().optional().nullable()}))})}),f=d.Ik({session_id:d.Yj(),readiness:d.Ik({rho:d.ai().min(0).max(1),overload_multiplier:d.ai().min(.9).max(1.1),flags:d.YO(d.Yj())}),per_exercise:d.YO(d.Ik({exercise_id:d.Yj(),name:d.Yj().optional(),predicted_chance_to_beat_best:d.ai().min(0).max(1),planned_volume_kg:d.ai().positive().optional().nullable(),best_volume_kg:d.ai().positive().optional().nullable(),sets:d.YO(d.Ik({set_id:d.Yj(),suggested_weight_kg:d.ai().positive().optional().nullable(),suggested_reps:d.ai().positive().optional().nullable(),suggested_rest_seconds:d.ai().positive().optional().nullable(),rationale:d.Yj()}))})),session_predicted_chance:d.ai().min(0).max(1),summary:d.Yj(),warnings:d.YO(d.Yj()),recovery_recommendations:d.Ik({recommended_rest_between_sets:d.Yj(),recommended_rest_between_sessions:d.Yj(),session_duration_estimate:d.Yj().optional().nullable(),additional_recovery_notes:d.YO(d.Yj())}).optional().nullable()});d.Ik({energyLevel:d.ai().min(1).max(10),sleepQuality:d.ai().min(1).max(10),recoveryFeeling:d.ai().min(1).max(10),stressLevel:d.ai().min(1).max(10)}),d.Ik({recovery_score:d.ai().min(0).max(100).optional(),sleep_performance:d.ai().min(0).max(100).optional(),hrv_now_ms:d.ai().positive().optional(),hrv_baseline_ms:d.ai().positive().optional(),rhr_now_bpm:d.ai().positive().optional(),rhr_baseline_bpm:d.ai().positive().optional(),yesterday_strain:d.ai().min(0).max(21).optional()})},29294:a=>{"use strict";a.exports=require("next/dist/server/app-render/work-async-storage.external.js")},31135:(a,b,c)=>{"use strict";c.r(b),c.d(b,{handler:()=>P,patchFetch:()=>O,routeModule:()=>K,serverHooks:()=>N,workAsyncStorage:()=>L,workUnitAsyncStorage:()=>M});var d={};c.r(d),c.d(d,{POST:()=>J,runtime:()=>I});var e=c(95736),f=c(9117),g=c(4044),h=c(39326),i=c(32324),j=c(261),k=c(54290),l=c(85328),m=c(38928),n=c(46595),o=c(3421),p=c(17679),q=c(41681),r=c(63446),s=c(86439),t=c(51356),u=c(10641),v=c(8579),w=c(23879),x=c(89403),y=c(48689),z=c(71559);function A(a,b,c){return Math.min(Math.max(a,b),c)}function B(a,b=2.5){return Math.round(a/b)*b}async function C(a,b,c,d,e=2){if(0===c.length)return[];let f=await a.query.workoutSessions.findMany({where:(0,y.Uo)((0,y.eq)(a.schema.workoutSessions.user_id,b),d?(0,y.ne)(a.schema.workoutSessions.id,d):void 0),orderBy:[(0,z.i)(a.schema.workoutSessions.workoutDate)],with:{exercises:{where:a=>(0,y.RV)(a.exerciseName,c),orderBy:a=>[(0,z.Y)(a.setOrder)]},template:{columns:{id:!0}}},limit:50}),g=new Map;for(let a of f)for(let b of a.exercises){g.has(b.exerciseName)||g.set(b.exerciseName,[]);let c=g.get(b.exerciseName),d=c.find(b=>b.sessionId===a.id);if(!d)if(!(c.length<e))continue;else d={sessionId:a.id,templateId:a.template?.id,workoutDate:a.workoutDate,sets:[]},c.push(d);d.sets.push({weight:b.weight?parseFloat(b.weight):null,reps:b.reps,volume:b.weight&&b.reps?parseFloat(b.weight)*b.reps:null})}return Array.from(g.entries()).map(([a,b])=>({exerciseName:a,sessions:b}))}let D=`You are an expert strength coach analyzing workout performance data and WHOOP recovery metrics to provide intelligent, personalized training recommendations. Always respond with VALID JSON that matches the output_schema below. No prose outside JSON.

Core Mission:
- Analyze historical exercise performance from the user's last 2 workout sessions with REAL historical data
- Integrate ACTUAL WHOOP recovery metrics (HRV, sleep, recovery score, RHR) fetched automatically from user's connected device
- Recommend optimal weight/rep adjustments for each exercise in the current template
- Predict performance chances based on progressive overload principles and current readiness
- Provide exercise-specific rationale based on individual progression patterns and cross-template exercise linking
- Include recovery recommendations and rest period suggestions between sets and sessions

Key Principles:
- Progressive overload: systematic increase in training stress over time
- Individual variation: recommendations based on user's actual performance history
- Recovery integration: adjust intensity based on physiological readiness markers
- Safety first: conservative recommendations when data is incomplete or recovery is poor
- Exercise specificity: tailor advice to each movement pattern's unique characteristics
- Cross-template awareness: use exercise linking data to track progress across different workout templates

ENHANCED INPUT DATA AVAILABLE:
The workout_plan contains DYNAMIC exercises from the user's selected template with ACTUAL historical data:
- target_weight_kg and target_reps reflect the user's current/planned values for this session
- historical_sessions contains RAW workout data from the last 2 sessions for progression analysis
- exercise_linking provides cross-template tracking information
- raw_exercise_history includes comprehensive historical data with template context
- whoop contains HISTORICAL data from database (stored via webhooks) OR mapped from manual wellness input
- manual_wellness (if present) contains user's direct wellness input from the simplified 2-input system

Input contract (you will receive this as the user message JSON):
{
  "session_id": "string",
  "user_profile": {
    "experience_level": "beginner|intermediate|advanced",
    "min_increment_kg": number | null,
    "preferred_rpe": number | null
  },
  "whoop": {
    "recovery_score": number | null,
    "sleep_performance": number | null,
    "hrv_now_ms": number | null,
    "hrv_baseline_ms": number | null,
    "rhr_now_bpm": number | null,
    "rhr_baseline_bpm": number | null,
    "yesterday_strain": number | null
  },
  "manual_wellness": {  // OPTIONAL: Present when user provided direct wellness input
    "energy_level": number,       // 1-10 scale (How energetic do you feel?)
    "sleep_quality": number,      // 1-10 scale (How well did you sleep?)
    "has_whoop_data": boolean,    // false for manual input
    "device_timezone": string,    // User's timezone
    "notes": string | null        // Optional user notes (max 500 chars)
  },
  "workout_plan": {
    "exercises": [
      {
        "exercise_id": "string",
        "name": "string",
        "tags": ["strength"|"hypertrophy"|"endurance"],
        "sets": [
          {
            "set_id": "string",
            "target_reps": number | null,
            "target_weight_kg": number | null,
            "target_rpe": number | null
          }
        ],
        "historical_sessions": [
          {
            "workout_date": "string",
            "sets": [
              {
                "weight_kg": number,
                "reps": number,
                "volume_kg": number,
                "estimated_rpe": number | null,
                "rest_seconds": number | null
              }
            ]
          }
        ]
      }
    ]
  },
  "exercise_linking": [
    {
      "template_exercise_id": number,
      "exercise_name": "string",
      "master_exercise_id": number | null,
      "linked_across_templates": boolean,
      "linked_templates": [
        {
          "template_id": number,
          "template_name": "string",
          "exercise_id": number
        }
      ],
      "total_linked_count": number
    }
  ],
  "raw_exercise_history": [
    {
      "exerciseName": "string",
      "sessions": [
        {
          "sessionId": number,
          "workoutDate": "string",
          "templateId": number,
          "sets": [
            {
              "weight": number,
              "reps": number,
              "volume": number
            }
          ],
          "template_info": {
            "template_id": number,
            "session_id": number
          }
        }
      ]
    }
  ],
  "prior_bests": {
    "by_exercise_id": {
      "<exercise_id>": {
        "best_total_volume_kg": number | null,
        "best_e1rm_kg": number | null
      }
    }
  }
}

Deterministic algorithm you MUST apply before reasoning:

1) Compute normalized readiness components (fallback to neutral if missing):
   // Enhanced wellness computation with manual wellness integration
   let h = hrv_now_ms && hrv_baseline_ms
     ? clip(hrv_now_ms / hrv_baseline_ms, 0.8, 1.2)
     : 1.0;
   let r = rhr_now_bpm && rhr_baseline_bpm
     ? clip(rhr_baseline_bpm / rhr_now_bpm, 0.8, 1.2)
     : 1.0;
   
   // ENHANCED: Manual wellness integration when available
   if (manual_wellness) {
     // Use manual wellness data - simplified but user-validated approach
     let s = manual_wellness.sleep_quality / 10;  // Convert 1-10 to 0-1 scale
     let energy_component = manual_wellness.energy_level / 10;  // Convert 1-10 to 0-1 scale
     // For manual wellness, weight more heavily on user's direct assessment
     let rho = clip(0.5*energy_component + 0.4*s + 0.05*h + 0.05*r, 0, 1);
     // Note: User notes in manual_wellness.notes should be considered in summary/rationale
   } else {
     // Standard WHOOP-based calculation
     let s = sleep_performance != null ? sleep_performance / 100 : 0.5;
     let c = recovery_score != null ? recovery_score / 100 : 0.5;
     let rho = clip(0.4*c + 0.3*s + 0.15*h + 0.15*r, 0, 1);
   }
   // Optional light dampening for high yesterday_strain (>14): rho -= 0.05 (clip>=0)

2) Overload multiplier (applies to today's planned load):
   let Delta = clip(1 + 0.3*(rho - 0.5), 0.9, 1.1);

3) Per-set adjustments with progression analysis and fatigue consideration:
   - Analyze historical_sessions to identify progression trends (weight increases, rep increases, stagnation)
   - Use exercise_linking data to consider performance across different templates
   - Apply individual set recommendations with fatigue consideration:
     * Set 1: Full intensity with target_weight_kg * Delta
     * Set 2: Apply 5% fatigue reduction: target_weight_kg * Delta * 0.95 
     * Set 3: Apply 10% fatigue reduction: target_weight_kg * Delta * 0.90
     * Continue pattern for additional sets
   - If target_weight_kg exists: new_weight = round_to_increment(target_weight_kg * Delta * fatigue_multiplier)
     Keep reps; optionally adjust reps by \xb11 if target_rpe is provided to better match.
   - If no weight but target_reps exists (e.g., bodyweight): adjust reps by
       reps' = round(target_reps * Delta * fatigue_multiplier)
     For endurance/very high reps, cap change to \xb12 reps.
   - Respect min_increment_kg if provided; default increment is 2.5 kg.
   - Factor in cross-template performance when making recommendations
   - Each set should have unique suggested_weight_kg, suggested_reps, and rationale

4) Recovery and rest recommendations (individualized per set):
   - Based on readiness score, recommend rest periods between sets (90-180s for strength, 60-90s for hypertrophy)
   - Apply progressive rest increases: Set 1: base rest, Set 2: base rest + 15s, Set 3: base rest + 30s
   - If rho < 0.6, recommend longer rest periods and potentially fewer sets
   - Consider sleep quality for recovery between sessions
   - Include set-specific rest recommendations in each set's rationale

5) Chance to beat best (per exercise and overall):
   Define planned_volume = sum(new_weight * target_reps) where numerically valid.
   Let best_vol = prior_bests[exercise_id].best_total_volume_kg (if present).
   Let gamma = (best_vol && planned_volume)
     ? max(0.1, planned_volume / max(1, best_vol))
     : 1.0; // neutral if missing
   Probability p_ex = clip(0.5 + 0.35*(rho - 0.5) + 0.15*ln(gamma), 0.05, 0.98)
   Overall session chance is volume-weighted mean across exercises with volumes,
   else mean of p_ex.

Helper definitions you must use:
- clip(x, a, b) = min(max(x, a), b)
- ln = natural log
- round_to_increment(x) = nearest user_profile.min_increment_kg or 2.5

Safety & behavior:
- Never increase load for beginners above +5% in a single day; if Delta would exceed this, cap Delta to 1.05 for experience_level="beginner".
- If rho < 0.35 or missing critical data (hrv/rhr + recovery_score), prefer no increase; set Delta <= 1.0 and explain why.
- Use actual historical performance data to validate recommendations
- Consider cross-template exercise linking for more accurate progression tracking
- ENHANCED: When manual_wellness is present, acknowledge the user's direct input in recommendations and summary
- ENHANCED: Reference manual_wellness.notes in rationale when provided (user context like stress, illness, excitement)
- ENHANCED: For manual wellness, emphasize that recommendations are based on user's self-assessment
- Do not invent missing numbers; degrade gracefully.
- If inputs are inconsistent, return warnings and conservative advice.
- Always include a short coach-style summary with recovery recommendations and flags.
- Include rest period suggestions in rationale
- Not medical advice.

Output schema (respond with EXACTLY this shape):
{
  "session_id": "string",
  "readiness": {
    "rho": number,
    "overload_multiplier": number,
    "flags": string[]
  },
  "per_exercise": [
    {
      "exercise_id": "string",
      "name": "string (exercise display name)",
      "predicted_chance_to_beat_best": number,
      "planned_volume_kg": number | null,
      "best_volume_kg": number | null,
      "sets": [
        {
          "set_id": "string",
          "suggested_weight_kg": number | null,
          "suggested_reps": number | null,
          "suggested_rest_seconds": number | null,
          "rationale": "string (include rest period recommendation and progression reasoning)"
        }
      ]
    }
  ],
  "session_predicted_chance": number,
  "summary": "string (include recovery recommendations, rest between sessions, and overall session strategy)",
  "warnings": string[],
  "recovery_recommendations": {
    "recommended_rest_between_sets": "string",
    "recommended_rest_between_sessions": "string",
    "session_duration_estimate": "string",
    "additional_recovery_notes": string[]
  }
}

Formatting:
- Return JSON only. No markdown, no extra text.
- Use concise English, metric units, and conservative tone.
- Include specific rest period recommendations (e.g., "2-3 minutes rest")
- Mention cross-template progression when relevant
- Include session-to-session recovery advice in summary`;var E=c(31553),F=c(30314),G=c(58511),H=c(72626);let I="nodejs";async function J(a){try{var b,d;let e,f,g,h,i=await a.json(),j=!1;try{j=!!(e=x.PT.parse(i)).manual_wellness}catch{e=w.z_.parse(i)}let k=await G.x.get(a);if(!k||G.x.isExpired(k))return u.NextResponse.json({error:"Authentication required"},{status:401});let l=parseInt(e.session_id),m=[],n=null,o={recovery_score:50,sleep_performance:75,hrv_now_ms:40,hrv_baseline_ms:40,rhr_now_bpm:60,rhr_baseline_bpm:60,yesterday_strain:10},p=e.whoop||o;try{let[a]=await E.db.select({isActive:F.userIntegrations.isActive}).from(F.userIntegrations).where((0,y.Uo)((0,y.eq)(F.userIntegrations.user_id,k.userId),(0,y.eq)(F.userIntegrations.provider,"whoop"),(0,y.eq)(F.userIntegrations.isActive,!0)));if(a?.isActive){let a=new Date;a.setDate(a.getDate()-2);let b=a.toISOString().split("T")[0],c=await E.db.query.whoopRecovery.findFirst({where:(0,y.Uo)((0,y.eq)(F.whoopRecovery.user_id,k.userId),(0,y.RO)(F.whoopRecovery.date,new Date(b))),orderBy:(0,z.i)(F.whoopRecovery.date)}),d=await E.db.query.whoopSleep.findFirst({where:(0,y.Uo)((0,y.eq)(F.whoopSleep.user_id,k.userId),(0,y.RO)(F.whoopSleep.start,a)),orderBy:(0,z.i)(F.whoopSleep.start)});c||d?(p={recovery_score:c?.recovery_score||p.recovery_score||o.recovery_score,sleep_performance:d?.sleep_performance_percentage||p.sleep_performance||o.sleep_performance,hrv_now_ms:c?.hrv_rmssd_milli?c.hrv_rmssd_milli:p.hrv_now_ms||o.hrv_now_ms,hrv_baseline_ms:c?.hrv_rmssd_baseline?c.hrv_rmssd_baseline:p.hrv_baseline_ms||o.hrv_baseline_ms,rhr_now_bpm:c?.resting_heart_rate||p.rhr_now_bpm||o.rhr_now_bpm,rhr_baseline_bpm:c?.resting_heart_rate_baseline||p.rhr_baseline_bpm||o.rhr_baseline_bpm,yesterday_strain:p.yesterday_strain||o.yesterday_strain},H.vF.info("using_stored_whoop_data",{userId:k.userId,recovery_score:p.recovery_score,sleep_performance:p.sleep_performance,data_sources:[c?"recovery":null,d?"sleep":null].filter(Boolean)})):H.vF.warn("no_recent_whoop_data",{userId:k.userId})}}catch(a){H.vF.error("Failed to fetch WHOOP data from database, using fallback",a,{userId:k.userId})}try{let a=(n=await E.db.query.workoutSessions.findFirst({where:(0,y.eq)(F.workoutSessions.id,l),with:{template:{with:{exercises:{orderBy:a=>[(0,z.Y)(a.orderIndex)]}}},exercises:!0}}))&&"object"==typeof n&&null!==n&&n.template;a&&"object"==typeof a&&!Array.isArray(a)&&Array.isArray(a.exercises)&&(m=a.exercises)}catch(a){console.error("Error fetching session template:",a)}if(j&&e.manual_wellness){let a=e.manual_wellness,b=a.energy_level/10,c=a.sleep_quality/10;f=Math.max(0,Math.min(1,.6*b+.4*c)),g=[],a.energy_level<=3&&g.push("low_energy"),a.sleep_quality<=3&&g.push("poor_sleep"),a.notes?.toLowerCase().includes("stress")&&g.push("stress_noted"),a.notes?.toLowerCase().includes("sick")&&g.push("illness_noted"),g.push("manual_wellness_input")}else{let a=function(a){let b=[],c=null!=a.recovery_score?a.recovery_score/100:.5,d=null!=a.sleep_performance?a.sleep_performance/100:.5,e=1;a.hrv_now_ms&&a.hrv_baseline_ms?e=A(a.hrv_now_ms/a.hrv_baseline_ms,.8,1.2):b.push("missing_hrv");let f=1;a.rhr_now_bpm&&a.rhr_baseline_bpm?f=A(a.rhr_baseline_bpm/a.rhr_now_bpm,.8,1.2):b.push("missing_rhr");let g=A(.4*c+.3*d+.15*e+.15*f,0,1);return a.yesterday_strain&&a.yesterday_strain>14&&(g=Math.max(0,g-.05),b.push("high_strain_yesterday")),c<.6&&b.push("low_recovery"),d<.6&&b.push("poor_sleep"),c>=.8&&b.push("good_recovery"),d>=.8&&b.push("good_sleep"),{rho:g,flags:b}}(p);f=a.rho,g=a.flags}let q=(b=f,d=e.user_profile.experience_level,h=A(1+.3*(b-.5),.9,1.1),"beginner"===d&&(h=Math.min(h,1.05)),h);if(f<.35)return u.NextResponse.json({session_id:e.session_id,readiness:{rho:f,overload_multiplier:1,flags:[...g,"unsafe_readiness"]},per_exercise:[],session_predicted_chance:.3,summary:"Your recovery metrics suggest taking it easy today. Stick to your planned loads.",warnings:["Low readiness detected - no overload recommended"]});let r=null;try{r=await E.db.query.userPreferences.findFirst({where:(0,y.eq)(F.userPreferences.user_id,k.userId)})}catch(a){console.error("Error fetching user preferences:",a)}let s=m.map(a=>a.exerciseName),t=[];if(s.length>0&&n)try{t=await C({query:E.db.query,schema:{workoutSessions:F.workoutSessions,sessionExercises:F.sessionExercises}},n.user_id,s,l)}catch(a){console.error("Error fetching exercise history:",a)}let I=[];if(t.length>0)try{I=function(a,b,c="adaptive",d={}){return a.map(a=>{let e=[],f=!1;if(0===a.sessions.length)return{exerciseName:a.exerciseName,suggestions:[{type:"weight",current:0,suggested:20,rationale:"No historical data - starting with conservative weight"}],plateauDetected:!1};let g=a.sessions[0];if(!g?.sets.length)return{exerciseName:a.exerciseName,suggestions:[],plateauDetected:!1};let h=g.sets.reduce((a,b)=>(b.volume||0)>(a.volume||0)?b:a);if(a.sessions.length>=2){let b=a.sessions[1];if(b?.sets.length){let a=b.sets.reduce((a,b)=>(b.volume||0)>(a.volume||0)?b:a),c=h.volume||0,d=a.volume||0;c-d<=.05*d&&(f=!0)}}if(h.weight&&h.reps){let a=h.weight,g=h.reps,i=1,j="";switch(c){case"linear":let k=d.linearIncrement||2.5;e.push({type:"weight",current:a,suggested:a+k,rationale:`Linear progression: +${k}kg from last session${f?" (plateau detected - consider deload)":""}`,plateauDetected:f});break;case"percentage":let l=(d.percentageIncrement||2.5)/100;i=1+l,e.push({type:"weight",current:a,suggested:B(a*i),rationale:`Percentage progression: +${(100*l).toFixed(1)}% from last session${f?" (plateau detected - consider deload)":""}`,plateauDetected:f});break;default:f&&b<.7?(i=.9,j="Deload recommended: plateau detected with poor readiness"):f?(i=1.025,j="Light progression despite plateau (good readiness allows push)"):(i=b>.7?1.05:b>.5?1:.975,j=`Adaptive progression based on ${b>.7?"excellent":b>.5?"good":"low"} readiness`),"weight"===(d.progressionModel||(1===i?"reps":"weight"))?e.push({type:"weight",current:a,suggested:B(a*i),rationale:j,plateauDetected:f}):e.push({type:"reps",current:g,suggested:g+1,rationale:"Volume progression: add 1 rep while maintaining weight",plateauDetected:f})}}return{exerciseName:a.exerciseName,suggestions:e,plateauDetected:f}})}(t,f,r?.progression_type||"adaptive",{linearIncrement:r?.linear_progression_kg?r.linear_progression_kg:2.5,percentageIncrement:r?.percentage_progression?r.percentage_progression:2.5})}catch(a){console.error("Error calculating progression suggestions:",a)}let J=v._.AI_GATEWAY_MODEL_HEALTH||"xai/grok-3-mini",K=!1;try{!function(){if(!(v._.AI_GATEWAY_API_KEY||v._.VERCEL_AI_GATEWAY_API_KEY))throw Error("Missing AI gateway API key")}(),K=!0}catch{K=!1}if(!K||0===m.length){let a=(m.length>0?m:e.workout_plan.exercises).map(a=>{let b=n?.exercises?.filter(b=>b.exerciseName===a.exerciseName||b.exerciseName===a.exercise_id)||[],c=b.length>0?b.length:3,d=t.find(b=>b.exerciseName===a.exerciseName||b.exerciseName===a.exercise_id),e=I.find(b=>b.exerciseName===a.exerciseName||b.exerciseName===a.exercise_id),g=20,h=8,i=g,j=h,k=!1;if(d&&d.sessions.length>0){let a=d.sessions[0];if(a?.sets&&a.sets.length>0){let b=a.sets.reduce((a,b)=>{let c=a.weight||0;return(b.weight||0)>c?b:a});g=b.weight||g,h=b.reps||h}}if(e&&e.suggestions.length>0){let a=e.suggestions.find(a=>"weight"===a.type),b=e.suggestions.find(a=>"reps"===a.type);i=a?.suggested||g,j=b?.suggested||h,k=e.plateauDetected,e.suggestions[0]}else i=B(g*q),j=Math.round(h*q);let l=f>.7?120:f>.5?150:180,m=Array.from({length:c},(b,c)=>{let m=0===c?1:1-.05*c,n=B(i*m),o=Math.max(1,Math.round(j*m)),p=l+15*c,q=`Set ${c+1}: `;if(e&&e.suggestions.length>0){let a=e.suggestions[0];a&&(q+=a.rationale),k&&(q+=" [Plateau Alert]"),c>0&&(q+=` with ${Math.round((1-m)*100)}% fatigue adjustment`),q+=`. Rest ${Math.round(p/60)} minutes.`}else d?.sessions&&d.sessions.length>0?(q+=`Based on last session performance (${g}kg x ${h}) with ${f>.7?"good":f>.5?"moderate":"low"} readiness`,c>0&&(q+=` and ${Math.round((1-m)*100)}% fatigue adjustment`)):(q+="Conservative estimate with readiness adjustment",c>0&&(q+=" and fatigue consideration")),q+=`. Rest ${Math.round(p/60)} minutes.`;return{set_id:`${a.id||a.exercise_id}_${c+1}`,suggested_weight_kg:n,suggested_reps:o,suggested_rest_seconds:p,rationale:q}}),o=d?.sessions[0]?.sets.reduce((a,b)=>a+(b.volume||0),0)||0;return{exercise_id:a.exerciseName||a.exercise_id,name:a.exerciseName||a.exercise_id,predicted_chance_to_beat_best:f>.7?.8:f>.5?.6:.4,planned_volume_kg:null,best_volume_kg:o>0?o:null,sets:m}}),b=a.reduce((a,b)=>a+b.sets.length,0),c=f>.7?120:f>.5?150:180,d=Math.round((b*c+60*b)/60),h=I.filter(a=>a.plateauDetected).length,i=h>0?[`Plateau detected in ${h} exercise${h>1?"s":""} - consider deload or variation`]:[],k=r?.progression_type||"adaptive",l="";switch(k){case"linear":l=`Using linear progression (+${r?.linear_progression_kg||"2.5"}kg per session)`;break;case"percentage":l=`Using percentage progression (+${r?.percentage_progression||"2.5"}% per session)`;break;default:l="Using adaptive progression based on readiness and performance"}return u.NextResponse.json({session_id:e.session_id,readiness:{rho:f,overload_multiplier:q,flags:g},per_exercise:a,session_predicted_chance:f>.7?.75:f>.5?.6:.45,summary:`Enhanced load recommendations based on ${j?"your wellness input":"readiness"} (${Math.round(100*f)}%) and ${t.length>0?"historical performance data":"conservative estimates"}. ${l}. ${j&&e.manual_wellness?.notes?`Note: ${e.manual_wellness.notes.slice(0,100)}${e.manual_wellness.notes.length>100?"...":""}`:""} Allow ${d} minutes for this session.`,warnings:[...K?[]:["AI Gateway not configured - using enhanced fallback calculations"],...j?["Recommendations based on manual wellness input"]:[],...i],recovery_recommendations:{recommended_rest_between_sets:`${Math.round(c/60)} minutes for strength exercises`,recommended_rest_between_sessions:f>.7?"24-48 hours":f>.5?"48-72 hours":"72+ hours for full recovery",session_duration_estimate:`${d} minutes`,additional_recovery_notes:[f<.5?"Consider active recovery or light cardio instead":"Monitor fatigue levels throughout session","Prioritize sleep and nutrition for optimal recovery",t.length>0?"Track progression over multiple sessions":"Focus on movement quality"]}})}let L={...e,whoop:p,...j&&{manual_wellness:e.manual_wellness},workout_plan:{exercises:m.map(a=>{let b=n?.exercises?.filter(b=>b.exerciseName===a.exerciseName)||[],c=b.length>0?b.length:3,d=t.find(b=>b.exerciseName===a.exerciseName),e=null,f=null;if(d?.sessions&&d.sessions.length>0){let a=d.sessions[0];if(a?.sets&&a.sets.length>0){let b=a.sets.reduce((a,b)=>(b.weight||0)>(a.weight||0)?b:a);e=b.weight,f=b.reps}}return{exercise_id:a.exerciseName.toLowerCase().replace(/\s+/g,"_"),name:a.exerciseName,tags:["strength"],sets:Array.from({length:c},(b,c)=>({set_id:`${a.id}_${c+1}`,target_reps:f||8,target_weight_kg:e||20})),historical_sessions:d?.sessions.map(a=>({workout_date:a.workoutDate,sets:a.sets.map(a=>({weight_kg:a.weight,reps:a.reps,volume_kg:a.volume,estimated_rpe:null,rest_seconds:null}))}))||[]}})},exercise_linking:await (async()=>{try{let a=await E.db.query.exerciseLinks.findMany({where:(0,y.Uo)((0,y.eq)(F.exerciseLinks.user_id,k.userId)),with:{templateExercise:{with:{template:!0}}}}),b=new Map,c=new Map;return a.forEach(a=>{b.set(a.templateExerciseId,a);let d=a.masterExerciseId;c.has(d)||c.set(d,[]),c.get(d).push(a)}),m.map(a=>{let d=b.get(a.id);if(d){let b=c.get(d.masterExerciseId)||[];return{template_exercise_id:a.id,exercise_name:a.exerciseName,master_exercise_id:d.masterExerciseId,linked_across_templates:b.length>1,linked_templates:b.map(a=>{let b=null,c=null,d=a.templateExercise;if(d&&"object"==typeof d&&!Array.isArray(d)){let a=d.template;a&&"object"==typeof a&&!Array.isArray(a)&&(b="number"==typeof a.id?a.id:null,c="string"==typeof a.name?a.name:null)}return{template_id:b,template_name:c,exercise_id:a.templateExerciseId}}),total_linked_count:b.length}}return{template_exercise_id:a.id,exercise_name:a.exerciseName,master_exercise_id:null,linked_across_templates:!1,linked_templates:[],total_linked_count:0}})}catch(a){return H.vF.error("Error fetching exercise linking data",a,{userId:k.userId}),m.map(a=>({template_exercise_id:a.id,exercise_name:a.exerciseName,master_exercise_id:null,linked_across_templates:!1,linked_templates:[],total_linked_count:0}))}})(),raw_exercise_history:t.map(a=>({...a,sessions:a.sessions.map(a=>({...a,template_info:{template_id:a.templateId,session_id:a.sessionId}}))}))},{generateText:M}=await c.e(9628).then(c.bind(c,39628)),N=await M({model:J,system:D,prompt:JSON.stringify(L)}),O=JSON.parse(N.text);if(!O.session_id||!O.readiness)throw Error("Invalid AI response structure");return u.NextResponse.json(O)}catch(a){if(H.vF.error("Health advice API error",a),"ZodError"===a.name)return u.NextResponse.json({error:"Invalid input data",details:a.errors},{status:400});return u.NextResponse.json({error:"Failed to generate health advice",detail:a.message},{status:500})}}let K=new e.AppRouteRouteModule({definition:{kind:f.RouteKind.APP_ROUTE,page:"/api/health-advice/route",pathname:"/api/health-advice",filename:"route",bundlePath:"app/api/health-advice/route"},distDir:".next",relativeProjectDir:"",resolvedPagePath:"/Users/steven/swole-tracker/src/app/api/health-advice/route.ts",nextConfigOutput:"standalone",userland:d}),{workAsyncStorage:L,workUnitAsyncStorage:M,serverHooks:N}=K;function O(){return(0,g.patchFetch)({workAsyncStorage:L,workUnitAsyncStorage:M})}async function P(a,b,c){var d;let e="/api/health-advice/route";"/index"===e&&(e="/");let g=await K.prepare(a,b,{srcPage:e,multiZoneDraftMode:!1});if(!g)return b.statusCode=400,b.end("Bad Request"),null==c.waitUntil||c.waitUntil.call(c,Promise.resolve()),null;let{buildId:u,params:v,nextConfig:w,isDraftMode:x,prerenderManifest:y,routerServerContext:z,isOnDemandRevalidate:A,revalidateOnlyGenerated:B,resolvedPathname:C}=g,D=(0,j.normalizeAppPath)(e),E=!!(y.dynamicRoutes[D]||y.routes[C]);if(E&&!x){let a=!!y.routes[C],b=y.dynamicRoutes[D];if(b&&!1===b.fallback&&!a)throw new s.NoFallbackError}let F=null;!E||K.isDev||x||(F="/index"===(F=C)?"/":F);let G=!0===K.isDev||!E,H=E&&!G,I=a.method||"GET",J=(0,i.getTracer)(),L=J.getActiveScopeSpan(),M={params:v,prerenderManifest:y,renderOpts:{experimental:{cacheComponents:!!w.experimental.cacheComponents,authInterrupts:!!w.experimental.authInterrupts},supportsDynamicResponse:G,incrementalCache:(0,h.getRequestMeta)(a,"incrementalCache"),cacheLifeProfiles:null==(d=w.experimental)?void 0:d.cacheLife,isRevalidate:H,waitUntil:c.waitUntil,onClose:a=>{b.on("close",a)},onAfterTaskError:void 0,onInstrumentationRequestError:(b,c,d)=>K.onRequestError(a,b,d,z)},sharedContext:{buildId:u}},N=new k.NodeNextRequest(a),O=new k.NodeNextResponse(b),P=l.NextRequestAdapter.fromNodeNextRequest(N,(0,l.signalFromNodeResponse)(b));try{let d=async c=>K.handle(P,M).finally(()=>{if(!c)return;c.setAttributes({"http.status_code":b.statusCode,"next.rsc":!1});let d=J.getRootSpanAttributes();if(!d)return;if(d.get("next.span_type")!==m.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${d.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let e=d.get("next.route");if(e){let a=`${I} ${e}`;c.setAttributes({"next.route":e,"http.route":e,"next.span_name":a}),c.updateName(a)}else c.updateName(`${I} ${a.url}`)}),g=async g=>{var i,j;let k=async({previousCacheEntry:f})=>{try{if(!(0,h.getRequestMeta)(a,"minimalMode")&&A&&B&&!f)return b.statusCode=404,b.setHeader("x-nextjs-cache","REVALIDATED"),b.end("This page could not be found"),null;let e=await d(g);a.fetchMetrics=M.renderOpts.fetchMetrics;let i=M.renderOpts.pendingWaitUntil;i&&c.waitUntil&&(c.waitUntil(i),i=void 0);let j=M.renderOpts.collectedTags;if(!E)return await (0,o.I)(N,O,e,M.renderOpts.pendingWaitUntil),null;{let a=await e.blob(),b=(0,p.toNodeOutgoingHttpHeaders)(e.headers);j&&(b[r.NEXT_CACHE_TAGS_HEADER]=j),!b["content-type"]&&a.type&&(b["content-type"]=a.type);let c=void 0!==M.renderOpts.collectedRevalidate&&!(M.renderOpts.collectedRevalidate>=r.INFINITE_CACHE)&&M.renderOpts.collectedRevalidate,d=void 0===M.renderOpts.collectedExpire||M.renderOpts.collectedExpire>=r.INFINITE_CACHE?void 0:M.renderOpts.collectedExpire;return{value:{kind:t.CachedRouteKind.APP_ROUTE,status:e.status,body:Buffer.from(await a.arrayBuffer()),headers:b},cacheControl:{revalidate:c,expire:d}}}}catch(b){throw(null==f?void 0:f.isStale)&&await K.onRequestError(a,b,{routerKind:"App Router",routePath:e,routeType:"route",revalidateReason:(0,n.c)({isRevalidate:H,isOnDemandRevalidate:A})},z),b}},l=await K.handleResponse({req:a,nextConfig:w,cacheKey:F,routeKind:f.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:y,isRoutePPREnabled:!1,isOnDemandRevalidate:A,revalidateOnlyGenerated:B,responseGenerator:k,waitUntil:c.waitUntil});if(!E)return null;if((null==l||null==(i=l.value)?void 0:i.kind)!==t.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==l||null==(j=l.value)?void 0:j.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});(0,h.getRequestMeta)(a,"minimalMode")||b.setHeader("x-nextjs-cache",A?"REVALIDATED":l.isMiss?"MISS":l.isStale?"STALE":"HIT"),x&&b.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let m=(0,p.fromNodeOutgoingHttpHeaders)(l.value.headers);return(0,h.getRequestMeta)(a,"minimalMode")&&E||m.delete(r.NEXT_CACHE_TAGS_HEADER),!l.cacheControl||b.getHeader("Cache-Control")||m.get("Cache-Control")||m.set("Cache-Control",(0,q.getCacheControlHeader)(l.cacheControl)),await (0,o.I)(N,O,new Response(l.value.body,{headers:m,status:l.value.status||200})),null};L?await g(L):await J.withPropagatedContext(a.headers,()=>J.trace(m.BaseServerSpan.handleRequest,{spanName:`${I} ${a.url}`,kind:i.SpanKind.SERVER,attributes:{"http.method":I,"http.target":a.url}},g))}catch(b){if(L||b instanceof s.NoFallbackError||await K.onRequestError(a,b,{routerKind:"App Router",routePath:D,routeType:"route",revalidateReason:(0,n.c)({isRevalidate:H,isOnDemandRevalidate:A})}),E)throw b;return await (0,o.I)(N,O,new Response(null,{status:500})),null}}},44870:a=>{"use strict";a.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},58511:(a,b,c)=>{"use strict";c.d(b,{x:()=>i});var d=c(8579);let e="workos_session",f="production"===d._.NODE_ENV;async function g(a){let b=function(){let a=d._.WORKER_SESSION_SECRET;if(!a||a.length<32)throw Error("WORKER_SESSION_SECRET must be at least 32 characters long");return a}(),c=new TextEncoder,e=await crypto.subtle.importKey("raw",c.encode(b),{name:"HMAC",hash:"SHA-256"},!1,["sign"]);return Array.from(new Uint8Array(await crypto.subtle.sign("HMAC",e,c.encode(a)))).map(a=>a.toString(16).padStart(2,"0")).join("")}async function h(a,b){return await g(a)===b}class i{static async create(a){let b=JSON.stringify({...a,refreshToken:a.refreshToken??null}),c=await g(b),d=`${b}.${c}`;return[`${e}=${encodeURIComponent(d)}`,"Max-Age=2592000","Path=/","HttpOnly",f?"Secure":"","SameSite=lax"].filter(Boolean).join("; ")}static async get(a){let b=a.headers.get("cookie");if(!b)return null;let c=this.extractCookieValue(b,e);if(!c)return null;try{let a=decodeURIComponent(c),b=a.lastIndexOf(".");if(b<=0||b===a.length-1)return null;let d=a.slice(0,b),e=a.slice(b+1);if(!await h(d,e))return null;try{let a=JSON.parse(d);if(!a.userId||!a.accessToken||!a.expiresAt)throw Error("Invalid session data");let b=void 0===a.refreshToken?null:a.refreshToken;return{...a,refreshToken:b}}catch(a){throw Error("Invalid session data format")}}catch(a){return null}}static destroy(){return[`${e}=`,"Max-Age=0","Path=/","HttpOnly",f?"Secure":"","SameSite=lax"].filter(Boolean).join("; ")}static extractCookieValue(a,b){for(let c of a.split(";").map(a=>a.trim()))if(c.startsWith(`${b}=`))return c.substring(`${b}=`.length);return null}static async hasSession(a){return null!==await this.get(a)}static isExpired(a){let b=Math.floor(Date.now()/1e3);return a.expiresAt<=b}}},63033:a=>{"use strict";a.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},78335:()=>{},86439:a=>{"use strict";a.exports=require("next/dist/shared/lib/no-fallback-error.external")},89403:(a,b,c)=>{"use strict";c.d(b,{AJ:()=>h,PT:()=>i,Py:()=>g,ag:()=>f});var d=c(59256);let e=d.Ik({energyLevel:d.ai().min(1).max(10),sleepQuality:d.ai().min(1).max(10),deviceTimezone:d.Yj().min(1),notes:d.Yj().max(500).optional()});d.Ik({id:d.ai().optional(),userId:d.Yj(),sessionId:d.ai().optional(),date:d.p6(),wellnessData:e,hasWhoopData:d.zM(),whoopData:d.Ik({recovery_score:d.ai().min(0).max(100).optional(),sleep_performance:d.ai().min(0).max(100).optional(),hrv_now_ms:d.ai().positive().optional(),hrv_baseline_ms:d.ai().positive().optional(),rhr_now_bpm:d.ai().positive().optional(),rhr_baseline_bpm:d.ai().positive().optional(),yesterday_strain:d.ai().min(0).max(21).optional()}).optional(),deviceTimezone:d.Yj(),submittedAt:d.p6(),notes:d.Yj().max(500).optional()});let f=d.Ik({sessionId:d.ai().optional(),energyLevel:d.ai().min(1).max(10),sleepQuality:d.ai().min(1).max(10),deviceTimezone:d.Yj().min(1),notes:d.Yj().max(500).optional(),hasWhoopData:d.zM().default(!1),whoopData:d.Ik({recovery_score:d.ai().min(0).max(100).optional(),sleep_performance:d.ai().min(0).max(100).optional(),hrv_now_ms:d.ai().positive().optional(),hrv_baseline_ms:d.ai().positive().optional(),rhr_now_bpm:d.ai().positive().optional(),rhr_baseline_bpm:d.ai().positive().optional(),yesterday_strain:d.ai().min(0).max(21).optional()}).optional()}),g=d.Ik({limit:d.ai().min(1).max(100).default(30),offset:d.ai().min(0).default(0),startDate:d.p6().optional(),endDate:d.p6().optional()}),h=d.Ik({days:d.ai().min(1).max(365).default(30)}),i=d.Ik({session_id:d.Yj(),user_profile:d.Ik({experience_level:d.k5(["beginner","intermediate","advanced"]),min_increment_kg:d.ai().positive().optional(),preferred_rpe:d.ai().min(1).max(10).optional()}),whoop:d.Ik({recovery_score:d.ai().min(0).max(100).optional(),sleep_performance:d.ai().min(0).max(100).optional(),hrv_now_ms:d.ai().positive().optional(),hrv_baseline_ms:d.ai().positive().optional(),rhr_now_bpm:d.ai().positive().optional(),rhr_baseline_bpm:d.ai().positive().optional(),yesterday_strain:d.ai().min(0).max(21).optional()}).optional(),manual_wellness:d.Ik({energy_level:d.ai().min(1).max(10).optional(),sleep_quality:d.ai().min(1).max(10).optional(),has_whoop_data:d.zM(),device_timezone:d.Yj().optional(),notes:d.Yj().max(500).optional()}).optional(),workout_plan:d.Ik({exercises:d.YO(d.Ik({exercise_id:d.Yj(),name:d.Yj(),tags:d.YO(d.k5(["strength","hypertrophy","endurance"])),sets:d.YO(d.Ik({set_id:d.Yj(),target_reps:d.ai().positive().optional().nullable(),target_weight_kg:d.ai().positive().optional().nullable(),target_rpe:d.ai().min(1).max(10).optional().nullable()}))}))}),prior_bests:d.Ik({by_exercise_id:d.g1(d.Yj(),d.Ik({best_total_volume_kg:d.ai().positive().optional().nullable(),best_e1rm_kg:d.ai().positive().optional().nullable()}))})})},96487:()=>{}};var b=require("../../../webpack-runtime.js");b.C(a);var c=b.X(0,[5873,1428,3708,7639,1692,1553],()=>b(b.s=31135));module.exports=c})();