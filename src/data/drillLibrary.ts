import type { Drill, DrillCategory } from '../models/TrainingSession';

export const drillLibrary: Drill[] = [
  // MARKING DRILLS (6)
  {
    id: 'mark-1',
    name: 'One-on-One Marking',
    description: 'Defenders compete for high marks under pressure',
    category: 'marking',
    durationSeconds: 900,
    playersRequired: 12,
    equipment: ['footballs', 'pinnies'],
    instructions: [
      'Pair players up facing each other 5m apart',
      'Coach throws high ball between them',
      'First to secure clean mark scores point',
      'Rotate defenders after 5 reps'
    ],
    difficulty: 'beginner'
  },
  {
    id: 'mark-2',
    name: 'Contested Mark Competition',
    description: 'High-pressure marking under physical contest',
    category: 'marking',
    durationSeconds: 1200,
    playersRequired: 16,
    equipment: ['footballs', 'pinnies', 'cones'],
    instructions: [
      'Set up 10m x 10m contest zones',
      'Pairs contest marks in zone',
      'Defender must make contact before mark',
      'Award points for clean marks vs contested'
    ],
    difficulty: 'advanced'
  },
  {
    id: 'mark-3',
    name: 'Running Mark Technique',
    description: 'Catch marks while moving at speed',
    category: 'marking',
    durationSeconds: 600,
    playersRequired: 8,
    equipment: ['footballs', 'cones'],
    instructions: [
      'Players jog in line between cones',
      'Coach throws ball at running pace',
      'Players must mark on the run',
      'Focus on hand positioning and body control'
    ],
    difficulty: 'intermediate'
  },
  {
    id: 'mark-4',
    name: 'One-Handed Mark Drill',
    description: 'Develop one-handed marking ability',
    category: 'marking',
    durationSeconds: 600,
    playersRequired: 10,
    equipment: ['footballs', 'pinnies'],
    instructions: [
      'Players spread in circle',
      'Coach throws balls at various heights',
      'Players must use one hand only',
      'Alternate hands each rep'
    ],
    difficulty: 'intermediate'
  },
  {
    id: 'mark-5',
    name: 'Shoulder Mark Pressure',
    description: 'Marking while being physically pressured',
    category: 'marking',
    durationSeconds: 900,
    playersRequired: 14,
    equipment: ['footballs', 'pinnies', 'cones'],
    instructions: [
      'Offensive player runs route',
      'Defender applies light contact',
      'Coach throws ball to offensive player',
      'Focus on shielding body and securing mark'
    ],
    difficulty: 'advanced'
  },
  {
    id: 'mark-6',
    name: 'Set Mark Practice',
    description: 'Static marking from set situations',
    category: 'marking',
    durationSeconds: 600,
    playersRequired: 6,
    equipment: ['footballs'],
    instructions: [
      'Players line up 15m from coach',
      'Coach throws set balls',
      'Players practice clean marking technique',
      'Emphasize hand-eye coordination'
    ],
    difficulty: 'beginner'
  },

  // KICKING DRILLS (7)
  {
    id: 'kick-1',
    name: 'Passing Patterns',
    description: 'Short passing accuracy and timing',
    category: 'kicking',
    durationSeconds: 900,
    playersRequired: 8,
    equipment: ['footballs', 'cones'],
    instructions: [
      'Pairs stand 10m apart',
      'Practice toe-pokes and short kicks',
      'Focus on clean contact and accuracy',
      'Increase distance progressively'
    ],
    difficulty: 'beginner'
  },
  {
    id: 'kick-2',
    name: 'Long Kicking Accuracy',
    description: 'Develop long kicking power and accuracy',
    category: 'kicking',
    durationSeconds: 1200,
    playersRequired: 10,
    equipment: ['footballs', 'cones', 'target markers'],
    instructions: [
      'Set targets at 40m, 50m, 60m',
      'Players kick from kicking line',
      'Award points based on distance from target',
      'Focus on follow-through and body position'
    ],
    difficulty: 'intermediate'
  },
  {
    id: 'kick-3',
    name: 'Drop Punt Technique',
    description: 'Perfect drop punt mechanics',
    category: 'kicking',
    durationSeconds: 900,
    playersRequired: 8,
    equipment: ['footballs', 'cones'],
    instructions: [
      'Players line up 20m from targets',
      'Focus on ball drop and contact point',
      'Coach provides individual feedback',
      '5 reps each, rotate targets'
    ],
    difficulty: 'beginner'
  },
  {
    id: 'kick-4',
    name: 'Kicking on the Run',
    description: 'Accurate kicking while moving',
    category: 'kicking',
    durationSeconds: 900,
    playersRequired: 12,
    equipment: ['footballs', 'cones'],
    instructions: [
      'Players jog through cone course',
      'Pick up and kick on the run',
      'Target accuracy while maintaining speed',
      'Retrieve and repeat'
    ],
    difficulty: 'intermediate'
  },
  {
    id: 'kick-5',
    name: 'Gut Kick Drill',
    description: 'Low trajectory ground kicking',
    category: 'kicking',
    durationSeconds: 600,
    playersRequired: 10,
    equipment: ['footballs', 'cones'],
    instructions: [
      'Kick ball low along ground',
      'Targets 20-30m away',
      'Focus on body weight over ball',
      'Quick release and follow-through'
    ],
    difficulty: 'intermediate'
  },
  {
    id: 'kick-6',
    name: 'Place Kicking Pressure',
    description: 'Accurate place kicks under time pressure',
    category: 'kicking',
    durationSeconds: 900,
    playersRequired: 6,
    equipment: ['footballs', 'goal posts', 'timer'],
    instructions: [
      'Place kicks from 30m, 40m, 50m',
      '10 second kick clock',
      'Track accuracy percentage',
      'Simulate game pressure'
    ],
    difficulty: 'advanced'
  },
  {
    id: 'kick-7',
    name: 'One-Handed Handball',
    description: 'Quick handballs under pressure',
    category: 'kicking',
    durationSeconds: 600,
    playersRequired: 10,
    equipment: ['footballs', 'cones', 'pinnies'],
    instructions: [
      'Pairs practice handballing',
      'One-handed technique only',
      'Focus on snap and accuracy',
      'Rotate partners every 2 minutes'
    ],
    difficulty: 'intermediate'
  },

  // BALL-HANDLING DRILLS (6)
  {
    id: 'ball-1',
    name: 'Catching Drills',
    description: 'Basic catching fundamentals',
    category: 'ball-handling',
    durationSeconds: 600,
    playersRequired: 8,
    equipment: ['footballs'],
    instructions: [
      'Players in circle',
      'Coach throws various trajectories',
      'Focus on hand positioning',
      'Soft hands and follow-through'
    ],
    difficulty: 'beginner'
  },
  {
    id: 'ball-2',
    name: 'Double Ball Drill',
    description: 'Handle two balls simultaneously',
    category: 'ball-handling',
    durationSeconds: 900,
    playersRequired: 6,
    equipment: ['2x footbals per player'],
    instructions: [
      'Each player has 2 balls',
      'Alternate catching and throwing',
      'Develop hand-eye coordination',
      'Increase speed progressively'
    ],
    difficulty: 'intermediate'
  },
  {
    id: 'ball-3',
    name: 'Backhand Catches',
    description: 'Catching behind the body',
    category: 'ball-handling',
    durationSeconds: 600,
    playersRequired: 8,
    equipment: ['footballs', 'cones'],
    instructions: [
      'Players jog in line',
      'Coach throws behind running player',
      'Must catch without looking back',
      'Focus on spatial awareness'
    ],
    difficulty: 'advanced'
  },
  {
    id: 'ball-4',
    name: 'High Ball Reception',
    description: 'Marking high balls safely',
    category: 'ball-handling',
    durationSeconds: 900,
    playersRequired: 10,
    equipment: ['footballs', 'pinnies'],
    instructions: [
      'Players spread across field',
      'Coach throws high balls',
      'Focus on calling for ball',
      'Secure mark with hands above head'
    ],
    difficulty: 'intermediate'
  },
  {
    id: 'ball-5',
    name: 'Pressure Ball Security',
    description: 'Protect ball under contact',
    category: 'ball-handling',
    durationSeconds: 900,
    playersRequired: 12,
    equipment: ['footballs', 'pinnies', 'cones'],
    instructions: [
      'Ball carrier runs through zone',
      'Defenders apply light pressure',
      'Carrier must protect ball securely',
      'Rotate roles every 3 minutes'
    ],
    difficulty: 'advanced'
  },
  {
    id: 'ball-6',
    name: 'Catch and Release',
    description: 'Quick ball movement drills',
    category: 'ball-handling',
    durationSeconds: 600,
    playersRequired: 10,
    equipment: ['footballs', 'cones'],
    instructions: [
      'Triangle passing drill',
      'One touch only',
      'Quick catch and release',
      'Maintain speed and accuracy'
    ],
    difficulty: 'intermediate'
  },

  // DEFENCE DRILLS (6)
  {
    id: 'def-1',
    name: 'Defensive Stance Practice',
    description: 'Correct defensive positioning',
    category: 'defence',
    durationSeconds: 600,
    playersRequired: 8,
    equipment: ['cones', 'pinnies'],
    instructions: [
      'Players practice defensive stance',
      'Low centre of gravity',
      'Arms ready for contest',
      'Side-on positioning'
    ],
    difficulty: 'beginner'
  },
  {
    id: 'def-2',
    name: 'Marking the Runner',
    description: 'Follow and mark attacking players',
    category: 'defence',
    durationSeconds: 900,
    playersRequired: 10,
    equipment: ['pinnies', 'cones'],
    instructions: [
      'Attackers run set routes',
      'Defenders mark and follow',
      'Maintain body position between runner and ball',
      'Communicate with teammates'
    ],
    difficulty: 'intermediate'
  },
  {
    id: 'def-3',
    name: 'Defensive Contests',
    description: '1v1 defensive contests',
    category: 'defence',
    durationSeconds: 900,
    playersRequired: 12,
    equipment: ['footballs', 'pinnies', 'cones'],
    instructions: [
      '1v1 contests in 10m zone',
      'Defender tries to disrupt mark',
      'Offensive player tries to secure',
      'Rotate after 5 contests each'
    ],
    difficulty: 'advanced'
  },
  {
    id: 'def-4',
    name: 'Zonal Defence',
    description: 'Defend specific zones',
    category: 'defence',
    durationSeconds: 1200,
    playersRequired: 14,
    equipment: ['pinnies', 'cones', 'markers'],
    instructions: [
      'Divide field into zones',
      'Each player responsible for zone',
      'Defend any ball entering zone',
      'Communicate zone handoffs'
    ],
    difficulty: 'advanced'
  },
  {
    id: 'def-5',
    name: 'Pressing Defence',
    description: 'Aggressive ball pressure',
    category: 'defence',
    durationSeconds: 900,
    playersRequired: 12,
    equipment: ['pinnies', 'cones'],
    instructions: [
      'Defenders apply immediate pressure',
      'Force kicks or handballs',
      'Trap attackers in corners',
      'Coordinated team pressure'
    ],
    difficulty: 'advanced'
  },
  {
    id: 'def-6',
    name: 'Defensive Recovery',
    description: 'Backpedal and recovery speed',
    category: 'defence',
    durationSeconds: 600,
    playersRequired: 10,
    equipment: ['cones'],
    instructions: [
      'Sprint to cone, backpedal to start',
      'Shuffle sideways between cones',
      'Focus on defensive footwork',
      'Build recovery speed'
    ],
    difficulty: 'intermediate'
  },

  // ATTACK DRILLS (7)
  {
    id: 'att-1',
    name: 'Forward Entry Patterns',
    description: 'Breaking into forward line',
    category: 'attack',
    durationSeconds: 1200,
    playersRequired: 14,
    equipment: ['footballs', 'pinnies', 'cones'],
    instructions: [
      'Practice set forward entries',
      'Create space through movement',
      'Support players position correctly',
      'Execute 3-4 different patterns'
    ],
    difficulty: 'intermediate'
  },
  {
    id: 'att-2',
    name: 'Inside Forward Runs',
    description: 'Cutting inside from margins',
    category: 'attack',
    durationSeconds: 900,
    playersRequired: 10,
    equipment: ['footballs', 'cones'],
    instructions: [
      'Players start on margins',
      'Make timed runs inside',
      'Coach delivers ball at right moment',
      'Practice timing and pace'
    ],
    difficulty: 'intermediate'
  },
  {
    id: 'att-3',
    name: 'Half-Forward Flank Work',
    description: 'Skills from half-forward positions',
    category: 'attack',
    durationSeconds: 1200,
    playersRequired: 12,
    equipment: ['footballs', 'cones', 'pinnies'],
    instructions: [
      'Stationed on half-forward flanks',
      'Receive and shoot on goal',
      'Receive and kick to forward',
      'Rotate positions every drill'
    ],
    difficulty: 'advanced'
  },
  {
    id: 'att-4',
    name: 'Clearance Attack',
    description: 'Attacking contests from clearances',
    category: 'attack',
    durationSeconds: 1200,
    playersRequired: 16,
    equipment: ['footballs', 'pinnies', 'cones'],
    instructions: [
      'Simulate centre bounce',
      'Attackers compete for ball',
      'Follow-up plays on possession',
      'Quick decision making'
    ],
    difficulty: 'advanced'
  },
  {
    id: 'att-5',
    name: '50-50 Contests',
    description: 'Winning half-volleys',
    category: 'attack',
    durationSeconds: 900,
    playersRequired: 12,
    equipment: ['footballs', 'cones', 'pinnies'],
    instructions: [
      'Coach bounces ball between players',
      'Compete for 50-50 balls',
      'Secure possession and move quickly',
      'Focus on body position'
    ],
    difficulty: 'intermediate'
  },
  {
    id: 'att-6',
    name: 'Forward Press',
    description: 'Pressing from the forward line',
    category: 'attack',
    durationSeconds: 900,
    playersRequired: 10,
    equipment: ['pinnies', 'cones'],
    instructions: [
      'Forwards press opposition backline',
      'Force errors and turnovers',
      'Coordinate pressing triggers',
      'Recover quickly if beaten'
    ],
    difficulty: 'advanced'
  },
  {
    id: 'att-7',
    name: 'Quick Ball to Goal',
    description: 'Fast transitions to scoring',
    category: 'attack',
    durationSeconds: 900,
    playersRequired: 12,
    equipment: ['footballs', 'cones'],
    instructions: [
      'Win ball, quick release to goal',
      'Minimize touches under pressure',
      'Support runners create options',
      'Execute in under 5 seconds'
    ],
    difficulty: 'advanced'
  },

  // FITNESS DRILLS (8)
  {
    id: 'fit-1',
    name: 'Beep Test Intervals',
    description: 'Aerobic fitness development',
    category: 'fitness',
    durationSeconds: 900,
    playersRequired: 15,
    equipment: ['beep test app', 'cones'],
    instructions: [
      'Set beep test level',
      'Players shuttle between cones',
      'Match beep pace',
      'Track personal bests'
    ],
    difficulty: 'intermediate'
  },
  {
    id: 'fit-2',
    name: 'Sprint Intervals',
    description: 'Explosive speed development',
    category: 'fitness',
    durationSeconds: 900,
    playersRequired: 12,
    equipment: ['cones', 'timer'],
    instructions: [
      '10m, 20m, 40m sprints',
      'Full recovery between sprints',
      'Focus on technique and power',
      '8-10 reps per distance'
    ],
    difficulty: 'advanced'
  },
  {
    id: 'fit-3',
    name: 'Suicide Sprints',
    description: 'Anaerobic conditioning',
    category: 'fitness',
    durationSeconds: 600,
    playersRequired: 10,
    equipment: ['cones'],
    instructions: [
      'Line to 5m, back',
      'Line to 15m, back',
      'Line to 30m, back',
      'Repeat 5-6 times'
    ],
    difficulty: 'advanced'
  },
  {
    id: 'fit-4',
    name: 'Agility Ladder',
    description: 'Footwork and coordination',
    category: 'fitness',
    durationSeconds: 600,
    playersRequired: 8,
    equipment: ['agility ladder'],
    instructions: [
      'Various ladder patterns',
      'High knees, side shuffle',
      'Focus on foot placement',
      'Speed through progressively'
    ],
    difficulty: 'intermediate'
  },
  {
    id: 'fit-5',
    name: 'Box Jumps',
    description: 'Explosive leg power',
    category: 'fitness',
    durationSeconds: 600,
    playersRequired: 8,
    equipment: ['plyo boxes'],
    instructions: [
      'Jump onto box with both feet',
      'Step down carefully',
      'Focus on explosive takeoff',
      '10-12 reps per set'
    ],
    difficulty: 'intermediate'
  },
  {
    id: 'fit-6',
    name: 'Burpee Circuit',
    description: 'Full body conditioning',
    category: 'fitness',
    durationSeconds: 600,
    playersRequired: 10,
    equipment: ['timer'],
    instructions: [
      'Standard burpee technique',
      '30 seconds work, 30 seconds rest',
      'Complete 5 rounds',
      'Maintain form throughout'
    ],
    difficulty: 'advanced'
  },
  {
    id: 'fit-7',
    name: 'Change of Direction',
    description: 'Multi-directional speed',
    category: 'fitness',
    durationSeconds: 900,
    playersRequired: 10,
    equipment: ['cones'],
    instructions: [
      'Set up T-drill pattern',
      'Sprint, shuffle, backpedal',
      'Quick direction changes',
      '6 reps each direction'
    ],
    difficulty: 'intermediate'
  },
  {
    id: 'fit-8',
    name: 'Core Strength Circuit',
    description: 'Core stability and strength',
    category: 'fitness',
    durationSeconds: 900,
    playersRequired: 12,
    equipment: ['mats', 'medicine balls'],
    instructions: [
      'Plank variations',
      'Russian twists',
      'Medicine ball slams',
      '45 seconds each, 15 rest'
    ],
    difficulty: 'intermediate'
  },

  // GOAL-KICKING DRILLS (6)
  {
    id: 'goal-1',
    name: 'Goal Kicking Basics',
    description: 'Fundamental goal kicking technique',
    category: 'goal-kicking',
    durationSeconds: 900,
    playersRequired: 6,
    equipment: ['footballs', 'goal posts'],
    instructions: [
      'Start 15m from goals',
      'Focus on plant foot and follow-through',
      '10 kicks from each spot',
      'Track accuracy percentage'
    ],
    difficulty: 'beginner'
  },
  {
    id: 'goal-2',
    name: 'Goal Kicking Pressure',
    description: 'Simulated game pressure kicking',
    category: 'goal-kicking',
    durationSeconds: 1200,
    playersRequired: 6,
    equipment: ['footballs', 'goal posts', 'timer'],
    instructions: [
      '5 kicks from 5 different spots',
      '30 second kick clock',
      'Need 4/5 for perfect score',
      'Builds pressure handling'
    ],
    difficulty: 'advanced'
  },
  {
    id: 'goal-3',
    name: 'Angle Kicking',
    description: 'Kicking from acute angles',
    category: 'goal-kicking',
    durationSeconds: 900,
    playersRequired: 6,
    equipment: ['footballs', 'goal posts', 'cones'],
    instructions: [
      'Kicks from 45-degree angles',
      'Both left and right sides',
      'Adjust for angle difficulty',
      'Focus on body alignment'
    ],
    difficulty: 'intermediate'
  },
  {
    id: 'goal-4',
    name: 'Long Range Goal Kicking',
    description: 'Kicking from outside 50',
    category: 'goal-kicking',
    durationSeconds: 900,
    playersRequired: 6,
    equipment: ['footballs', 'goal posts'],
    instructions: [
      'Position 50m from goals',
      'Focus on technique under fatigue',
      '5 kicks each side',
      'Track success rate'
    ],
    difficulty: 'advanced'
  },
  {
    id: 'goal-5',
    name: 'Moving Goal Kicks',
    description: 'Kicking after movement',
    category: 'goal-kicking',
    durationSeconds: 900,
    playersRequired: 6,
    equipment: ['footballs', 'goal posts', 'cones'],
    instructions: [
      'Sprint to mark',
      'Set and kick',
      'Simulate game situations',
      'Quick setup time'
    ],
    difficulty: 'advanced'
  },
  {
    id: 'goal-6',
    name: 'Goal Kicking Competition',
    description: 'Points-based kicking contest',
    category: 'goal-kicking',
    durationSeconds: 1200,
    playersRequired: 8,
    equipment: ['footballs', 'goal posts', 'scoreboard'],
    instructions: [
      'Different spots worth different points',
      'Harder spots = more points',
      '20 kicks each player',
      'Highest score wins'
    ],
    difficulty: 'intermediate'
  },

  // RUCKING DRILLS (6)
  {
    id: 'ruck-1',
    name: 'Ruck Technique Basics',
    description: 'Fundamental rucking technique',
    category: 'rucking',
    durationSeconds: 900,
    playersRequired: 6,
    equipment: ['footballs', 'ruck bags'],
    instructions: [
      'Practice jump tap technique',
      'Focus on timing and reach',
      'Use ruck bags for resistance',
      '10 reps each session'
    ],
    difficulty: 'beginner'
  },
  {
    id: 'ruck-2',
    name: 'Contested Ruck Work',
    description: '1v1 ruck contests',
    category: 'rucking',
    durationSeconds: 1200,
    playersRequired: 8,
    equipment: ['footballs', 'cones'],
    instructions: [
      '1v1 centre bounce contests',
      'Win ball for team',
      'Rotate after 5 contests',
      'Focus on leverage and timing'
    ],
    difficulty: 'advanced'
  },
  {
    id: 'ruck-3',
    name: 'Ruck Support Play',
    description: 'Supporting ruckmen',
    category: 'rucking',
    durationSeconds: 900,
    playersRequired: 12,
    equipment: ['footballs', 'cones', 'pinnies'],
    instructions: [
      'Ruckmen contest',
      'Support players position',
      'Clear ball from contest',
      'Practice 3-play sequences'
    ],
    difficulty: 'intermediate'
  },
  {
    id: 'ruck-4',
    name: 'Tap Strategies',
    description: 'Advanced ruck tapping',
    category: 'rucking',
    durationSeconds: 900,
    playersRequired: 8,
    equipment: ['footballs', 'cones'],
    instructions: [
      'Tap to different teammates',
      'Practice quick releases',
      'Misdirection tactics',
      'Execute 4-5 different taps'
    ],
    difficulty: 'advanced'
  },
  {
    id: 'ruck-5',
    name: 'Ruck Fitness',
    description: 'Ruck-specific conditioning',
    category: 'rucking',
    durationSeconds: 900,
    playersRequired: 6,
    equipment: ['cones', 'timer'],
    instructions: [
      'Repeated jump efforts',
      '20 jumps, 30 sec rest',
      '6 sets minimum',
      'Build ruck endurance'
    ],
    difficulty: 'advanced'
  },
  {
    id: 'ruck-6',
    name: 'Secondman Play',
    description: 'Supporting the ruckman',
    category: 'rucking',
    durationSeconds: 900,
    playersRequired: 10,
    equipment: ['footballs', 'cones', 'pinnies'],
    instructions: [
      'Secondman positions',
      'Read ruck contest',
      'Clear ball quickly',
      'Communicate with ruckman'
    ],
    difficulty: 'intermediate'
  }
];

export const drillCategories: DrillCategory[] = [
  'marking',
  'kicking',
  'ball-handling',
  'defence',
  'attack',
  'fitness',
  'goal-kicking',
  'rucking'
];

export function getDrillsByCategory(category: DrillCategory): Drill[] {
  return drillLibrary.filter(drill => drill.category === category);
}

export function getDrillById(id: string): Drill | undefined {
  return drillLibrary.find(drill => drill.id === id);
}

export function getCategoryCount(category: DrillCategory): number {
  return drillLibrary.filter(drill => drill.category === category).length;
}
