// Common English words, roughly most frequent first. Used to build drills from the keys learned so far.
const RAW = `
the be to of and a in that have it for not on with he as you do at this but his by from they we say her she or an
will my one all would there their what so up out if about who get which go me when make can like time no just him
know take people into year your good some could them see other than then now look only come its over think also
back after use two how our work first well way even new want because any these give day most us is was are has had
did said made find here thing many may down should still last long great little own old right big high different
small large next early young important few public bad same able place week case point home water room mother area
money story fact month lot study book eye job word business issue side kind head house service friend father power
hour game line end member law car city name team minute idea kid body back parent face others level office door
health person art war history party result change morning reason research girl guy moment air teacher force
education foot boy age policy music market sense nation plan college interest death experience effect class control
care field development role effort rate heart drug show leader light voice wife police mind price report decision son
view relationship town road arm difference value building action model season society tax director position player
record paper space ground form event official matter center couple site project activity star table need court
american oil situation cost industry figure street image phone data picture practice piece land product doctor wall
patient worker news test movie north love support technology step baby computer type attention film tree source
organization hair window evidence population site truth bank rule glass dog cat fish bird bread rice fruit milk tea
coffee egg sugar salt food dinner lunch breakfast school student class lesson chair desk pen paper bag bus train
plane boat bike ticket travel trip map beach sea river lake mountain island sun moon rain wind cloud snow storm sky
red blue green yellow black white brown pink gray dark bright happy sad quick slow easy hard soft loud quiet warm cold
hot fresh clean simple strong weak rich poor full empty open close begin start stop keep let help play run walk read
write sing dance cook eat drink sleep wake call ask tell talk speak listen hear watch learn teach try move live leave
bring buy sell pay send build grow carry hold turn follow lead meet win lose fall feel seem stay put set sit stand
lie fly swim drive ride jump throw catch push pull cut draw wash wear fix plant pick hope wish plan share save spend
wait smile laugh cry shout rest join visit enjoy fill pass reach mark count check answer finish choose decide
remember forget agree allow appear arrive believe belong borrow climb collect cover cross deliver describe explain
gather guess hurry invite kick knock lift notice order paint prepare promise protect provide quit raise reply ring
shake shine shut sign solve sort spell spill stir taste thank touch trade trust visit vote warn whisper wonder worry
yard yarn zebra zone zero zoo quiz queen quote quilt quack jazz jam jar jet joke judge juice jump jungle just
`
export const WORDS_EN: string[] = [...new Set(RAW.split(/\s+/).filter(Boolean))]

// Original names for capitals practice (mix of Filipino and international names).
export const NAMES: string[] = [
  'Ana', 'Ben', 'Carlo', 'Dana', 'Elena', 'Felix', 'Gina', 'Hugo', 'Isabel', 'Jose', 'Kara', 'Liam', 'Maria',
  'Nico', 'Olga', 'Paolo', 'Quinn', 'Rosa', 'Sam', 'Tala', 'Uma', 'Victor', 'Wena', 'Xavi', 'Yna', 'Zach',
  'Manila', 'Cebu', 'Davao', 'Iloilo', 'Baguio', 'Tokyo', 'Paris', 'Lima', 'Oslo', 'Rome',
]

// Themed word groups for the "Word themes" lesson.
export const THEMES: string[][] = [
  ['rice', 'fish', 'bread', 'fruit', 'milk', 'egg', 'tea', 'coffee', 'sugar', 'salt', 'lunch', 'dinner'],
  ['school', 'student', 'teacher', 'lesson', 'class', 'chair', 'desk', 'pen', 'paper', 'book', 'test', 'quiz'],
  ['travel', 'trip', 'map', 'beach', 'island', 'river', 'mountain', 'boat', 'plane', 'train', 'ticket', 'bus'],
]

// Classic public-domain pangrams.
export const PANGRAMS: string[] = [
  'the quick brown fox jumps over the lazy dog',
  'pack my box with five dozen liquor jugs',
  'how vexingly quick daft zebras jump',
  'sphinx of black quartz judge my vow',
  'the five boxing wizards jump quickly',
]
