// ═══════════════════════════════════════════════════════════════
// HVAS Requirements — Sample data from Kravbild_MIMI600.pdf
// ═══════════════════════════════════════════════════════════════

import type { MindMapNodeData } from '../mindmapTypes';

export const HVAS_SAMPLE_DATA: MindMapNodeData = {
  id: 'hvas-root', label: 'HVAS', sublabel: 'Handbok för Vapen- & Ammunitionssäkerhet', color: '#6366f1',
  children: [
    { id: 'linked-docs', label: 'Länkade Kravdokument', color: '#eab308', children: [
      { id: 'hsystsak', label: 'H SystSäk' }, { id: 'hprogsak', label: 'H ProgSäk' },
      { id: 'hsakfalt', label: 'H Säk Fältm Arb' }, { id: 'hseps', label: 'H SEPS' },
    ]},
    { id: 'ch2', label: '2. Säkerhetsaktiviteter', sublabel: 'Materielgemensamma krav', color: '#8b5cf6', children: [] },
    { id: 'ch3', label: '3. Vapen', color: '#8b5cf6', children: [
      { id: 's31', label: '3.1 Vapengemensamma krav', color: '#a78bfa', children: [
        { id: 's311', label: '3.1.1 Riskområde', reqId: '1.301.001 T' },
        { id: 's312', label: '3.1.2 Egen personals säkerhet' },
        { id: 's313', label: '3.1.3 Farliga kemiska ämnen', reqId: '1.301.022 T' },
        { id: 's315', label: '3.1.5 Extrema klimatförhållanden' },
        { id: 's316', label: '3.1.6 Brand' }, { id: 's317', label: '3.1.7 Ljudtryck' },
        { id: 's318', label: '3.1.8 Bakflamma/bakåtstråle' },
        { id: 's319', label: '3.1.9 Vibrationschock' },
        { id: 's3110', label: '3.1.10 Tryck' }, { id: 's3111', label: '3.1.11 Fjäderkrafter' },
        { id: 's3112', label: '3.1.12 Hydrauliska/pneumatiska' },
        { id: 's3113', label: '3.1.13 Rekylkrafter' },
        { id: 's3115', label: '3.1.15 Laser' },
        { id: 's3116', label: '3.1.16 Mekanisk stabilitet' },
        { id: 's3117', label: '3.1.17 Transport' },
      ]},
      { id: 's32', label: '3.2 Eldrörsvapen & Utskjutning', sublabel: 'Robotar', color: '#a78bfa', children: [
        { id: 's321', label: '3.2.1 Vapeninstallation' }, { id: 's322', label: '3.2.2 Mekanism' },
        { id: 's323', label: '3.2.3 Avfyringsmekanism', comments: [
          { id: 'c1', text: 'Claes tycker detta är fel', author: 'Claes', type: 'issue' as const, status: 'open' as const, createdAt: '2025-01-15' },
        ]},
        { id: 's324', label: '3.2.4 Bakstycke' }, { id: 's325', label: '3.2.5 Täthet' },
        { id: 's326', label: '3.2.6 Efterbrännare' },
        { id: 's327', label: '3.2.7 Eldrörsslitage', reqId: '1.302.024 T' },
        { id: 's328', label: '3.2.8 Eldrörsutmattning' },
        { id: 's329', label: '3.2.9 Eldrörssprängning' },
        { id: 's3210', label: '3.2.10 Cook-off' },
        { id: 's3211', label: '3.2.11 Krutgasejektor' },
        { id: 's3212', label: '3.2.12 Mynningsbroms' },
        { id: 's3213', label: '3.2.13 Mynningsflamma' },
        { id: 's3215', label: '3.2.15 Ansättning' },
        { id: 's3216', label: '3.2.16 Rekylbromsar' },
        { id: 's3218', label: '3.2.18 Rekylfria vapen' },
      ]},
      { id: 's33', label: '3.3 Övriga vapensystem', color: '#a78bfa', children: [
        { id: 's334', label: '3.3.4 Balkar och lavetter' },
        { id: 's335', label: '3.3.5 Vapenbärare' },
        { id: 's336', label: '3.3.6 Luckor och dörrar' },
        { id: 's337', label: '3.3.7 Sikten och riktsystem', reqId: '1.303.026 T' },
        { id: 's338', label: '3.3.8 Styrsystem' },
      ]},
      { id: 's34', label: '3.4 Övrigt', color: '#a78bfa', children: [
        { id: 's341', label: '3.4.1 Tryckkärl' }, { id: 's342', label: '3.4.2 Lyftredskap' },
        { id: 's343', label: '3.4.3 Brandsläckning' },
      ]},
    ]},
    { id: 'ch4', label: '4. Ammunition', color: '#06b6d4', children: [
      { id: 's41', label: '4.1 Ammunitionsgemensamma krav', color: '#22d3ee', children: [
        { id: 's411', label: '4.1.1 Lågkänslig ammunition (IM)', sublabel: 'Insensitive Munition', reqId: '1.401.001 A',
          comments: [{ id: 'c2', text: 'Is our ammunition IM?', type: 'question' as const, status: 'open' as const, createdAt: '2025-01-20' }] },
        { id: 's412', label: '4.1.2 Additiv tillverkning' },
        { id: 's413', label: '4.1.3 Batterier', reqId: '1.401.005 T',
          comments: [{ id: 'c3', text: 'Be Magnus T kolla på detta', author: 'Magnus T', type: 'action' as const, status: 'open' as const, createdAt: '2025-02-01' }] },
        { id: 's414', label: '4.1.4 Kemikalielagstiftning', sublabel: 'REACH & CLP' },
        { id: 's415', label: '4.1.5 Övriga krav' },
      ]},
      { id: 's42', label: '4.2 Verkansdelar', color: '#22d3ee', children: [
        { id: 's421', label: '4.2.1 Materielmiljö' },
        { id: 's423', label: '4.2.3 Sprängladdade', children: [
          { id: 's4231', label: '4.2.3.1 Till eldrörsammunition' },
          { id: 's4233', label: '4.2.3.3 Till bomber' },
          { id: 's4234', label: '4.2.3.4 Till landminor' },
          { id: 's4235', label: '4.2.3.5 Till sjöminor/torpeder' },
          { id: 's4236', label: '4.2.3.6 Till övrig' },
        ]},
        { id: 's424', label: '4.2.4 Pyrotekniska', children: [
          { id: 's4241', label: '4.2.4.1 Till eldrörsammunition' },
          { id: 's4242', label: '4.2.4.2 Till raketer/bomber' },
        ]},
        { id: 's425', label: '4.2.5 Övriga verkansdelar' },
      ]},
      { id: 's43', label: '4.3 Utskjutning & Framdrivning', color: '#22d3ee', children: [
        { id: 's431', label: '4.3.1 Materielmiljö' }, { id: 's432', label: '4.3.2 Gemensamma krav' },
        { id: 's433', label: '4.3.3 Drivanordningar eldrör' },
        { id: 's434', label: '4.3.4 Drivanordningar raketer', children: [
          { id: 's4341', label: '4.3.4.1 Krutraketmotorer' },
          { id: 's4342', label: '4.3.4.2 Vätskeraketmotorer' },
          { id: 's4343', label: '4.3.4.3 Jetmotorer' },
          { id: 's4344', label: '4.3.4.4 Rammraketmotorer' },
          { id: 's4345', label: '4.3.4.5 Torpeddrivanordningar' },
          { id: 's4346', label: '4.3.4.6 Väteperoxid (HTP)' },
        ]},
      ]},
      { id: 's44', label: '4.4 Tändsystem', color: '#22d3ee', children: [
        { id: 's441', label: '4.4.1 Materielmiljö', children: [
          { id: 's4411', label: '4.4.1.1 Mekanisk påverkan' },
          { id: 's4412', label: '4.4.1.2 Fysikalisk/kemisk' },
        ]},
        { id: 's442', label: '4.4.2 Gemensamma krav', children: [
          { id: 's4421', label: '4.4.2.1 Konstruktionskrav' },
          { id: 's4422', label: '4.4.2.2 Provning' },
          { id: 's4425', label: '4.4.2.5 Neutralisering & destruktion' },
          { id: 's4426', label: '4.4.2.6 Folkrättsliga krav' },
        ]},
        { id: 's443', label: '4.4.3 Mekaniska delsystem' },
        { id: 's444', label: '4.4.4 Elektriska delsystem' },
        { id: 's445', label: '4.4.5 Elektronik & programvara', children: [
          { id: 's4452', label: '4.4.5.2 Redundans' },
          { id: 's4454', label: '4.4.5.4 Kortslutningsrisk' },
          { id: 's4457', label: '4.4.5.7 Strömförsörjning' },
          { id: 's44510', label: '4.4.5.10 Watch Dog Timer' },
          { id: 's44511', label: '4.4.5.11 Programvara' },
        ]},
        { id: 's447', label: '4.4.7 Lasertändsystem' },
        { id: 's448', label: '4.4.8 Tändsystem övrig ammo', children: [
          { id: 's4481', label: '4.4.8.1 Sprängmedel' },
          { id: 's4483', label: '4.4.8.3 Handgranater' },
          { id: 's4485', label: '4.4.8.5 Autodestruktion' },
          { id: 's4486', label: '4.4.8.6 Substridsdelar' },
          { id: 's4488', label: '4.4.8.8 Tandemsystem' },
        ]},
      ]},
      { id: 's45', label: '4.5 Förpackning', color: '#22d3ee', children: [
        { id: 's451', label: '4.5.1 Miljöfaktorer', children: [
          { id: 's4511', label: '4.5.1.1 Mekanisk' }, { id: 's4512', label: '4.5.1.2 Elektrisk' },
          { id: 's4513', label: '4.5.1.3 Kemisk' }, { id: 's4514', label: '4.5.1.4 Klimatisk' },
        ]},
        { id: 's452', label: '4.5.2 Krav förpackningar' },
        { id: 's453', label: '4.5.3 Krav ammo i förpackning' },
      ]},
    ]},
    { id: 'ch5', label: '5. Sammanställning', sublabel: 'Krav/Checklista', color: '#ec4899', children: [] },
  ],
};
