/**
 * Compact Thailand V1 destination place definitions (staging leads).
 * Unknown optional fields stay empty via the shared expander.
 * Prefer Helm Admin for later editorial curation.
 */

/** @type {import('../lib/thailand-catalog-v1.mjs').expandPlace extends Function ? any : never} */

function R(key, name, nameAr, sub, area, note, desc, why, urls, tags = []) {
  return { key, name, nameAr, cat: "restaurant", sub, area, note, desc, why, urls, tags, bestFor: ["dinner", sub] };
}
function C(key, name, nameAr, sub, area, note, desc, why, urls, tags = []) {
  return { key, name, nameAr, cat: "cafe", sub, area, note, desc, why, urls, tags, bestFor: ["coffee", "brunch"] };
}
function T(key, name, nameAr, sub, area, note, desc, why, urls, attractionType, tags = []) {
  return {
    key, name, nameAr, cat: "attraction", sub, area, note, desc, why, urls, tags,
    bestFor: ["sightseeing"],
    attraction: { attractionType },
  };
}
function A(key, name, nameAr, sub, area, note, desc, why, urls, activityType, tags = []) {
  return {
    key, name, nameAr, cat: "activity", sub, area, note, desc, why, urls, tags,
    bestFor: ["experience"],
    activity: { activityType },
  };
}
function N(key, name, nameAr, cat, sub, area, note, desc, why, urls, tags = []) {
  return { key, name, nameAr, cat, sub, area, note, desc, why, urls, tags, bestFor: [cat] };
}
function H(key, name, nameAr, accommodationType, area, note, desc, why, urls, tags = []) {
  return {
    key, name, nameAr, cat: "accommodation", sub: accommodationType, area, note, desc, why, urls, tags,
    bestFor: ["stay"],
    accommodationType,
  };
}

export const THAILAND_DESTINATIONS = [
  {
    slug: "bangkok",
    nameEn: "Bangkok",
    nameAr: "بانكوك",
    region: "Central Thailand",
    recommendedDuration: "4–6 days",
    tags: ["city", "food", "culture", "nightlife", "shopping", "temples"],
    summaryEn:
      "Thailand’s capital — temples, street food, river life, and nightlife across Rattanakosin, Sukhumvit, Silom, and riverside districts.",
    summaryAr:
      "عاصمة تايلاند — معابد وطعام شوارع وحياة نهرية وسهرات عبر راتاناكوسين وسوخومفيت وسيلوم وضفاف النهر.",
    shortDescriptionEn:
      "Capital city break with temples, dining, and nightlife. Recommended stay 4–6 days.",
    geographyNote:
      "Bangkok districts (Rattanakosin, Riverside, Silom/Sathorn, Sukhumvit, Thonglor, Ari) are not one walkable area. Do not conflate with Pattaya or other Thai beach destinations.",
    compactPlaces: [
      R("thip-samai", "Thip Samai", "ثيب ساماي", "thai_street_food", "Rattanakosin", "Famous pad thai shop near Democracy Monument", "Long-running Bangkok pad thai institution near the old city. Staging research lead; hours and wait times unverified.", "Classic Bangkok pad thai stop.", ["https://www.tourismthailand.org/"], ["thai", "street_food"]),
      R("jay-fai", "Jay Fai", "جاي فاي", "thai_street_fine", "Old Town", "Street-side crab omelette and wok cooking landmark", "Celebrated Bangkok wok restaurant known for seafood omelettes and night queues. Staging lead only.", "Iconic Bangkok wok dinner.", ["https://www.tourismthailand.org/"], ["thai", "seafood"]),
      R("sorn", "Sorn", "سورن", "southern_thai", "Sukhumvit", "Southern Thai fine dining (brand site)", "Southern Thai tasting-menu restaurant in Bangkok. Official brand presence used as identity lead only.", "Southern Thai fine dining in Sukhumvit.", ["https://www.sorn-bangkok.com/"], ["thai", "fine_dining"]),
      R("le-du", "Le Du", "لو دو", "modern_thai", "Silom / Sathorn", "Modern Thai restaurant", "Modern Thai restaurant in Bangkok’s Silom/Sathorn dining corridor. Staging research lead.", "Modern Thai dinner in Silom.", ["https://ledubkk.com/"], ["thai", "modern"]),
      R("blue-elephant", "Blue Elephant Cooking School & Restaurant Bangkok", "بلو إليفانت بانكوك", "thai_royal", "Phra Khanong / Sukhumvit", "Colonial Thai restaurant and cooking school campus", "Established Thai restaurant and cooking school brand in Bangkok. Staging lead; class schedules unverified.", "Thai dining and cooking campus.", ["https://www.blueelephant.com/bangkok/"], ["thai", "cooking_school"]),
      C("factory-coffee", "Factory Coffee", "فاكتوري كوفي", "specialty_coffee", "Ari", "Specialty coffee shop in Ari", "Specialty coffee café in Bangkok’s Ari neighbourhood. Staging lead.", "Specialty coffee in Ari.", ["https://www.factorycoffee.co/"], ["coffee", "ari"]),
      C("casa-lapin", "Casa Lapin", "كاسا لابين", "specialty_coffee", "Multiple / Thonglor area lead", "Specialty coffee brand with Bangkok cafés", "Bangkok specialty coffee brand; this record is a city dining lead for Casa Lapin cafés. Exact branch to be pinned in Admin later.", "Specialty coffee brand stop.", ["https://casalapin.com/"], ["coffee"]),
      C("roast", "ROAST Coffee & Eatery", "روست كوفي", "specialty_coffee", "Thonglor", "Coffee and light meals", "Coffee and eatery lead in Bangkok’s Thonglor scene. Staging only.", "Coffee and light plates in Thonglor.", ["https://www.tourismthailand.org/"], ["coffee", "thonglor"]),
      C("after-you", "After You Dessert Cafe", "أفتر يو", "dessert_cafe", "Siam / multiple", "Popular dessert café brand", "Popular Thai dessert café brand with Bangkok locations. Branch pin deferred to Admin.", "Dessert café favourite.", ["https://www.afteryoudessertcafe.com/"], ["dessert", "cafe"]),
      T("grand-palace", "Grand Palace & Wat Phra Kaew", "القصر الكبير ووات فرا كايو", "royal_palace_temple", "Rattanakosin", "Royal historic complex", "Bangkok’s primary royal and temple complex. Treat dress codes and ticket rules as unverified until Admin confirms.", "Must-see royal temple complex.", ["https://www.tourismthailand.org/Attraction/The-Grand-Palace"], "cultural", ["temple", "landmark"]),
      T("wat-arun", "Wat Arun", "وات أرون", "temple", "Thonburi riverside", "Temple of Dawn on Chao Phraya", "Riverside temple landmark opposite Rattanakosin. Staging attraction lead.", "Chao Phraya temple landmark.", ["https://www.tourismthailand.org/"], "cultural", ["temple", "riverside"]),
      T("chatuchak", "Chatuchak Weekend Market", "سوق شاتوتشاك", "market", "Chatuchak", "Large weekend market", "Bangkok’s large weekend market for shopping and street snacks. Opening cadence unverified in this staging pass.", "Vast weekend market browse.", ["https://www.tourismthailand.org/"], "other", ["market", "shopping"]),
      A("chao-phraya-cruise", "Chao Phraya Dinner Cruise", "رحلة عشاء على نهر تشاو فرايا", "river_cruise", "Riverside", "Generic dinner-cruise category lead — pin operator in Admin", "Indicative river dinner-cruise activity category for Bangkok riverside. Specific operator to be selected in Helm Admin; no supplier quote invented.", "Evening river cruise experience.", ["https://www.tourismthailand.org/"], "tour", ["river", "cruise"]),
      A("muay-thai-rajadamnern", "Muay Thai at Rajadamnern Stadium", "مواي تاي في راجادامنيرن", "spectator_sport", "Ratchadamnoen", "Historic Muay Thai stadium", "Historic Bangkok Muay Thai stadium experience lead. Bout schedules and ticket products unverified.", "Live Muay Thai night.", ["https://www.rajadamnern.com/"], "other", ["muay_thai"]),
      A("blue-elephant-cooking", "Blue Elephant Bangkok Cooking Class", "دورة طبخ بلو إليفانت", "cooking_class", "Phra Khanong", "Cooking class at Blue Elephant Bangkok", "Hands-on Thai cooking class offering associated with Blue Elephant Bangkok. Distinct from the restaurant dining record for Admin curation.", "Learn Thai cooking in Bangkok.", ["https://www.blueelephant.com/bangkok/"], "other", ["cooking", "class"]),
      A("longtail-or-bike", "Bangkok Canal / Local Bike Tour", "جولة قنوات أو دراجات في بانكوك", "local_tour", "Thonburi / old city", "Generic local tour lead", "Indicative canal or neighbourhood bike tour category. Operator to be pinned later; no booking URL invented.", "Local canals or bike exploration.", ["https://www.tourismthailand.org/"], "tour", ["tour"]),
      N("sky-bar", "Sky Bar at Lebua", "سكاي بار ليبوا", "bar", "rooftop_bar", "Sathon / Silom", "Rooftop bar at Lebua State Tower", "Famous Sathon rooftop bar lead. Dress codes and cover charges unverified.", "Skyline rooftop cocktails.", ["https://www.lebua.com/sky-bar/"], ["rooftop", "nightlife"]),
      N("sing-sing", "Sing Sing Theater", "سينغ سينغ ثييتر", "nightlife", "cabaret_club", "Sukhumvit / Thonglor area lead", "Theatrical nightlife venue lead in Bangkok.", "Theatrical nightlife venue lead in Bangkok. Entry and show schedules unverified.", "Theatrical nightlife night out.", ["https://singsingtheater.com/"], ["nightlife"]),
      N("levels-club", "Levels Club", "ليفلز كلوب", "nightlife", "nightclub", "Sukhumvit", "Nightclub lead on Sukhumvit", "Sukhumvit nightclub staging lead. Entry policies unverified.", "Late-night Sukhumvit club.", ["https://www.tourismthailand.org/"], ["nightclub"]),
      N("bamboo-bar", "Bamboo Bar", "بامبو بار", "bar", "live_music_bar", "Oriental / Riverside", "Live jazz bar at Mandarin Oriental Bangkok", "Historic riverside live-music bar lead inside Mandarin Oriental Bangkok.", "Jazz riverside bar night.", ["https://www.mandarinoriental.com/en/bangkok/chao-phraya-river"], ["jazz", "bar"]),
      H("mandarin-oriental-bangkok", "Mandarin Oriental, Bangkok", "ماندارين أورينتال بانكوك", "hotel", "Riverside", "Chao Phraya riverside landmark hotel", "Historic riverside luxury hotel. Amenities and rates omitted until verified.", "Classic Chao Phraya luxury stay.", ["https://www.mandarinoriental.com/en/bangkok/chao-phraya-river"], ["hotel", "riverside"]),
      H("peninsula-bangkok", "The Peninsula Bangkok", "ذا بينينسولا بانكوك", "hotel", "Riverside", "Riverside luxury hotel", "Peninsula Hotels riverside property in Bangkok. Staging accommodation lead.", "Riverside luxury hotel.", ["https://www.peninsula.com/en/bangkok"], ["hotel", "riverside"]),
      H("capella-bangkok", "Capella Bangkok", "كابيللا بانكوك", "hotel", "Riverside", "Capella riverside hotel", "Capella Bangkok riverside hotel lead. Distinct from Capella Ubud in Bali datasets.", "Design riverside luxury stay.", ["https://www.capellahotels.com/en/capella-bangkok"], ["hotel", "riverside"]),
      H("shangri-la-bangkok", "Shangri-La Bangkok", "شانغريلا بانكوك", "hotel", "Riverside / Sathorn", "Shangri-La riverside hotel", "Shangri-La Hotels Bangkok riverside property. Staging lead.", "Riverside Shangri-La stay.", ["https://www.shangri-la.com/bangkok/shangrila/"], ["hotel"]),
      H("anantara-siam", "Anantara Siam Bangkok Hotel", "أنانتارا سيام بانكوك", "hotel", "Ratchadamri / city centre", "City Anantara hotel", "Anantara Siam city hotel lead near central Bangkok shopping.", "Central Bangkok Anantara stay.", ["https://www.anantara.com/en/siam-bangkok"], ["hotel", "city"]),
      H("rosewood-bangkok", "Rosewood Bangkok", "روزوود بانكوك", "hotel", "Phloen Chit / central", "Rosewood tower hotel", "Rosewood Bangkok luxury hotel lead.", "Central Rosewood stay.", ["https://www.rosewoodhotels.com/en/bangkok"], ["hotel"]),
      H("the-siam", "The Siam", "ذا سيام", "boutique_hotel", "Riverside / Dusit", "Boutique riverside hotel", "Boutique all-suite riverside hotel in Bangkok. Staging lead.", "Boutique riverside suites.", ["https://thesiamhotel.com/"], ["boutique_hotel"]),
      H("four-seasons-bangkok", "Four Seasons Hotel Bangkok at Chao Phraya River", "فور سيزونز بانكوك", "hotel", "Riverside", "Four Seasons Chao Phraya hotel", "Four Seasons riverside Bangkok hotel lead.", "Four Seasons riverside stay.", ["https://www.fourseasons.com/bangkok/"], ["hotel"]),
      H("kimpton-maa-lai", "Kimpton Maa-Lai Bangkok", "كيمبتون ما لاي بانكوك", "boutique_hotel", "Langsuan / central", "Kimpton lifestyle hotel", "Kimpton Maa-Lai Bangkok lifestyle hotel lead.", "Central lifestyle boutique stay.", ["https://www.ihg.com/kimptonhotels/hotels/us/en/bangkok/bkkml/hoteldetail"], ["boutique_hotel"]),
      H("okura-prestige", "The Okura Prestige Bangkok", "أوكورا بريستيج بانكوك", "hotel", "Wireless Road / central", "Okura luxury hotel", "The Okura Prestige Bangkok hotel lead.", "Central Okura luxury stay.", ["https://www.okurabangkok.com/"], ["hotel"]),
    ],
  },

  {
    slug: "phuket",
    nameEn: "Phuket",
    nameAr: "بوكيت",
    region: "Andaman coast / Southern Thailand",
    recommendedDuration: "5–7 days",
    tags: ["beach", "islands", "dining", "nightlife", "diving", "old_town"],
    summaryEn:
      "Andaman island hub spanning Patong, Kata/Karon, Phuket Old Town, and the quieter north-west beaches — not one walkable resort.",
    summaryAr:
      "مركز جزر أندامان عبر باتونغ وكاتا/كارون والبلدة القديمة والشواطئ الشمالية الغربية — ليست منتجعاً واحداً قابلاً للمشي.",
    shortDescriptionEn:
      "Andaman beach and island hub. Recommended stay 5–7 days.",
    geographyNote:
      "Patong, Kata/Karon, Rawai/Nai Harn, Kamala/Surin/Bang Tao, and Phuket Town are separate clusters. Do not treat the island as one walkable beach strip.",
    compactPlaces: [
      R("raya", "Raya Restaurant", "رايا", "southern_thai", "Phuket Old Town", "Sino-Portuguese house restaurant", "Southern Thai restaurant in a restored Phuket Old Town house. Staging lead.", "Old Town southern Thai dinner.", ["https://www.tourismthailand.org/"], ["thai", "old_town"]),
      R("gabba-gabba", "GB Grill & Bar / beach dining lead", "جي بي جريل", "grill", "Chalong / south", "Grill dining lead", "South Phuket grill/dining staging lead pending Admin pin to a single verified venue page.", "South Phuket grill dinner.", ["https://www.tourismthailand.org/"], ["grill"]),
      R("suay", "Suay Restaurant", "سواي", "modern_thai", "Phuket Town", "Modern Thai in Phuket Town", "Modern Thai restaurant lead in Phuket Town.", "Modern Thai in Phuket Town.", ["https://www.tourismthailand.org/"], ["thai", "modern"]),
      R("kra-na", "Ka Jok See", "كا جوك سي", "thai", "Phuket Old Town", "Old Town Thai dinner house", "Long-running Old Town Thai dinner venue lead.", "Old Town Thai dinner.", ["https://www.tourismthailand.org/"], ["thai", "old_town"]),
      R("catch", "Catch Beach Club dining", "كاتش بيتش كلوب", "beach_dining", "Bang Tao", "Beach club dining (see nightlife record for club)", "Beachfront dining lead associated with Catch Beach Club Bang Tao. Club nightlife is a separate record.", "Bang Tao beachfront dining.", ["https://www.catchbeachclub.com/"], ["beach", "bang_tao"]),
      C("bookhemian", "Bookhemian", "بوكهيميان", "cafe_bookstore", "Phuket Old Town", "Café-bookstore", "Café and bookstore lead in Phuket Old Town.", "Old Town café-bookstore.", ["https://www.tourismthailand.org/"], ["cafe", "old_town"]),
      C("kopitiam", "One Chun Cafe & Restaurant", "ون تشون كافيه", "local_cafe", "Phuket Old Town", "Local Peranakan café lead", "Local Phuket Town café/restaurant lead.", "Local Old Town café plates.", ["https://www.tourismthailand.org/"], ["cafe", "local"]),
      C("amazon-cafe", "Café Amazon Phuket lead", "كافيه أمازون", "chain_coffee", "Island-wide", "Ubiquitous Thai coffee chain lead", "Café Amazon as a practical coffee-chain lead; pin a specific branch in Admin.", "Easy coffee stop.", ["https://www.cafeamazon.com/"], ["coffee"]),
      C("taste-bar-cafe", "Gallery Cafe Phuket Town lead", "غاليري كافيه", "cafe", "Phuket Old Town", "Gallery café lead", "Old Town gallery café staging lead.", "Artsy Old Town coffee.", ["https://www.tourismthailand.org/"], ["cafe"]),
      T("big-buddha", "Phuket Big Buddha", "بيغ بودا بوكيت", "viewpoint_statue", "Nakkerd Hills / Chalong", "Hilltop Buddha statue", "Hilltop Big Buddha viewpoint above Chalong. Access notes unverified.", "Island viewpoint statue.", ["https://www.tourismthailand.org/"], "viewpoint", ["viewpoint"]),
      T("old-town", "Phuket Old Town", "بلدة بوكيت القديمة", "heritage_district", "Phuket Town", "Sino-Portuguese heritage streets", "Heritage walking district with Sino-Portuguese shophouses. Not a ticketed single venue.", "Heritage shophouse streets.", ["https://www.tourismthailand.org/"], "cultural", ["heritage"]),
      T("promthep", "Promthep Cape", "رأس برومثيب", "viewpoint", "Rawai", "Sunset cape viewpoint", "Southern Phuket cape viewpoint popular for sunsets.", "Sunset cape views.", ["https://www.tourismthailand.org/"], "viewpoint", ["sunset"]),
      A("island-hopping", "Phi Phi / James Bond day trip from Phuket", "رحلة يومية إلى في في / جيمس بوند", "island_tour", "Pierrs / Chalong departure lead", "Day-trip category from Phuket", "Indicative Andaman island day-trip category departing Phuket. Operator and pier to be pinned in Admin; not a Koh Phi Phi destination duplicate lodging record.", "Andaman island day trip.", ["https://www.tourismthailand.org/"], "tour", ["islands"]),
      A("diving-phuket", "Phuket Diving / Snorkel Outing", "غوص أو سنوركل في بوكيت", "diving", "West coast / Chalong", "Dive activity category lead", "Indicative diving/snorkel activity lead. Shop operator to be selected later.", "Reef dive or snorkel day.", ["https://www.tourismthailand.org/"], "water_sports", ["diving"]),
      A("thai-cooking-phuket", "Phuket Thai Cooking Class", "دورة طبخ تايلاندية في بوكيت", "cooking_class", "Island-wide", "Cooking class category", "Indicative Thai cooking class activity for Phuket visitors. School to be pinned in Admin.", "Hands-on Thai cooking.", ["https://www.tourismthailand.org/"], "other", ["cooking"]),
      A("spa-phuket", "Phuket Spa Day", "يوم سبا في بوكيت", "spa", "West coast resorts belt", "Spa activity category", "Indicative spa-day activity lead; property spa menus unverified.", "Resort spa reset day.", ["https://www.tourismthailand.org/"], "wellness", ["spa"]),
      N("bangla", "Bangla Road Nightlife", "بانغلا رود", "nightlife", "nightlife_strip", "Patong", "Patong nightlife strip lead", "Patong’s Bangla Road nightlife corridor lead. Individual bars to be curated later in Admin.", "Patong nightlife strip.", ["https://www.tourismthailand.org/"], ["patong", "nightlife"]),
      N("catch-club", "Catch Beach Club", "كاتش بيتش كلوب", "beach_club", "beach_club", "Bang Tao", "Bang Tao beach club", "Bang Tao beach club with daybeds and events. Distinct from dining-focused Catch mention.", "Bang Tao beach club day.", ["https://www.catchbeachclub.com/"], ["beach_club", "bang_tao"]),
      N("yona-beach", "Yona Beach Club", "يونا بيتش كلوب", "beach_club", "beach_club", "Cape Panwa area lead", "Clifftop/unique beach club lead associated with Yona brand on Phuket. Staging only.", "Clifftop beach club staging lead. Entry and pricing unverified.", "Standout Phuket beach club.", ["https://yonabeachclub.com/"], ["beach_club"]),
      N("karma-bar", "Patong Beach Bar lead", "بار شاطئ باتونغ", "bar", "beach_bar", "Patong Beach", "Beach bar category on Patong", "Indicative Patong beach-bar lead for sunset drinks. Specific bar pin deferred.", "Patong sunset beach bar.", ["https://www.tourismthailand.org/"], ["bar", "patong"]),
      H("trisara", "Trisara", "تريسارا", "resort", "North-west coast", "Luxury villa resort", "Luxury north-west Phuket villa resort lead.", "Private-villa luxury resort.", ["https://www.trisara.com/"], ["resort"]),
      H("amanpuri", "Amanpuri", "أمانبوري", "resort", "Pansea Beach", "Aman resort Phuket", "Amanpuri luxury resort on Pansea Beach.", "Aman beach resort stay.", ["https://www.aman.com/resorts/amanpuri"], ["resort"]),
      H("keemala", "Keemala", "كيمالا", "resort", "Kamala", "Design resort in Kamala hills", "Design-led Keemala resort above Kamala.", "Design hillside resort.", ["https://www.keemala.com/"], ["resort", "kamala"]),
      H("sri-panwa", "Sri Panwa Phuket Luxury Pool Villa Hotel", "سري بانوا", "resort", "Cape Panwa", "Cape Panwa villa resort", "Cape Panwa luxury pool-villa resort lead.", "Cape Panwa villa resort.", ["https://www.sripanwa.com/"], ["resort", "panwa"]),
      H("paresa", "Paresa Resort Phuket", "باريسا", "resort", "Kamala cliffs", "Cliffside Kamala resort", "Cliffside Paresa resort above Kamala Bay.", "Cliffside Kamala resort.", ["https://www.paresaresorts.com/"], ["resort"]),
      H("marriott-phuket", "Phuket Marriott Resort & Spa, Merlin Beach", "ماريوت ميرلين بيتش", "resort", "Tri Trang / west", "Marriott Merlin Beach resort", "Marriott resort on Merlin Beach, Phuket.", "West-coast Marriott resort.", ["https://www.marriott.com/en-us/hotels/hktmb-phuket-marriott-resort-and-spa-merlin-beach/overview/"], ["resort"]),
      H("anantara-mai-khao", "Anantara Mai Khao Phuket Villas", "أنانتارا ماي خاو", "villa", "Mai Khao", "North Phuket beach villas", "Anantara beach villas on Mai Khao. Quieter north coast vs Patong.", "Mai Khao beach villas.", ["https://www.anantara.com/en/mai-khao-phuket"], ["villa"]),
      H("the-navee", "The Navee Naiyang Beach", "ذا ناڤي نايانغ", "boutique_hotel", "Nai Yang", "Airport-beach boutique hotel lead", "Boutique hotel lead near Nai Yang / airport beach.", "Nai Yang boutique stay.", ["https://www.thenavee.com/"], ["boutique_hotel"]),
      H("casa-breeze", "Casa Blanca Boutique Hotel Phuket Town lead", "كاسا بلانكا بوكيت", "boutique_hotel", "Phuket Old Town", "Old Town boutique lodging lead", "Boutique Old Town lodging lead; confirm live brand site in Admin before publish.", "Old Town boutique base.", ["https://www.tourismthailand.org/"], ["boutique_hotel", "old_town"]),
      H("katathani", "Katathani Phuket Beach Resort", "كاتاثاني", "resort", "Kata Noi", "Kata Noi beach resort", "Family-friendly Kata Noi beach resort lead.", "Kata Noi beach resort.", ["https://www.katathani.com/"], ["resort", "kata"]),
    ],
  },

  {
    slug: "krabi",
    nameEn: "Krabi",
    nameAr: "كرابي",
    region: "Andaman coast / Southern Thailand",
    recommendedDuration: "4–6 days",
    tags: ["beach", "cliffs", "islands", "nature", "railay", "ao_nang"],
    summaryEn:
      "Andaman mainland gateway for Railay cliffs, Ao Nang, and island day trips — distinct from Phuket town and Koh Phi Phi lodging.",
    summaryAr:
      "بوابة أندامان البرية لمنحدرات رايلاي وآو نانغ ورحلات الجزر — متميزة عن بوكيت وعن الإقامة في كو في في.",
    shortDescriptionEn:
      "Cliff and beach gateway on the Andaman coast. Recommended stay 4–6 days.",
    geographyNote:
      "Ao Nang, Railay (boat access), Krabi Town, and Tubkaak/Klong Muang are separate clusters. Island day trips do not make Phi Phi part of this destination’s lodging inventory.",
    compactPlaces: [
      R("seafood-ao-nang", "Ao Nang Seafood Strip lead", "مأكولات بحرية آو نانغ", "seafood", "Ao Nang beach road", "Beach-road seafood dining lead", "Indicative Ao Nang beachfront seafood dining lead. Pin a specific restaurant in Admin.", "Beachfront seafood dinner.", ["https://www.tourismthailand.org/"], ["seafood"]),
      R("krua-thara", "Krua Thara", "كروا ثارا", "seafood", "Ao Nang", "Popular seafood restaurant lead", "Well-known Ao Nang seafood restaurant lead.", "Ao Nang seafood institution.", ["https://www.tourismthailand.org/"], ["seafood"]),
      R("railay-dining", "Railay Beach Dining lead", "طعام رايلاي", "thai", "Railay East/West", "Railay beach dining lead", "Indicative Railay beach dining lead accessible by boat from Ao Nang.", "Casual Railay beach dinner.", ["https://www.tourismthailand.org/"], ["railay"]),
      R("gasebo", "The Gasebo", "الغازيبو", "international_thai", "Ao Nang", "Cliff/sea-view dining lead", "Ao Nang sea-view dining lead.", "Sea-view Ao Nang dinner.", ["https://www.tourismthailand.org/"], ["ao_nang"]),
      R("riverside-krabi", "Krabi Town Riverside Dining lead", "طعام نهر كرابي", "thai", "Krabi Town", "Town riverside dining", "Krabi Town riverside dining lead near the night market area.", "Town riverside Thai plates.", ["https://www.tourismthailand.org/"], ["krabi_town"]),
      C("ao-nang-coffee", "Ao Nang Coffee lead", "قهوة آو نانغ", "cafe", "Ao Nang", "Beach-town café lead", "Indicative Ao Nang specialty or brunch café lead.", "Ao Nang coffee break.", ["https://www.tourismthailand.org/"], ["coffee"]),
      C("krabi-town-cafe", "Krabi Town Cafe lead", "مقهى بلدة كرابي", "cafe", "Krabi Town", "Town café lead", "Café lead in Krabi Town for pre-ferry downtime.", "Town café pause.", ["https://www.tourismthailand.org/"], ["coffee"]),
      C("railay-cafe", "Railay Beach Cafe lead", "مقهى رايلاي", "cafe", "Railay", "Beach café lead", "Indicative Railay café/breakfast lead.", "Railay breakfast café.", ["https://www.tourismthailand.org/"], ["railay"]),
      C("amazon-krabi", "Café Amazon Krabi lead", "كافيه أمازون كرابي", "chain_coffee", "Ao Nang / town", "Chain coffee convenience lead", "Café Amazon as a practical coffee lead; pin branch later.", "Easy chain coffee.", ["https://www.cafeamazon.com/"], ["coffee"]),
      T("railay-beach", "Railay Beach", "شاطئ رايلاي", "beach", "Railay", "Boat-access beach and cliffs", "Iconic boat-access beach framed by limestone cliffs. Not road-linked to Ao Nang.", "Cliff-framed Railay beach.", ["https://www.tourismthailand.org/"], "natural", ["beach", "railay"]),
      T("tiger-cave", "Tiger Cave Temple (Wat Tham Suea)", "معبد كهف النمر", "temple_viewpoint", "Krabi inland", "Hilltop temple stairs", "Temple and viewpoint with long stair climb inland from Krabi. Difficulty unverified for each visitor.", "Stair-climb temple viewpoint.", ["https://www.tourismthailand.org/"], "cultural", ["temple"]),
      T("hong-island", "Hong Island", "جزيرة هونغ", "island", "Than Bok Khorani area / day trip", "Lagoon island day-trip target", "Popular lagoon island day trip from Krabi/Ao Nang. Not a lodging destination record.", "Emerald lagoon island day.", ["https://www.tourismthailand.org/"], "natural", ["island"]),
      A("rock-climbing", "Railay Rock Climbing", "تسلق صخور رايلاي", "climbing", "Railay", "Cliff climbing activity", "Indicative Railay rock-climbing activity. Guide operator to be pinned in Admin.", "Limestone sport climbing.", ["https://www.tourismthailand.org/"], "adventure", ["climbing"]),
      A("four-islands", "Krabi Four Islands Tour", "جولة الجزر الأربع", "island_tour", "Ao Nang piers", "Classic island-hopping tour", "Indicative four-islands day tour category (e.g. Chicken, Tub, Poda). Operator pin deferred.", "Classic island-hopping day.", ["https://www.tourismthailand.org/"], "tour", ["islands"]),
      A("kayak-mangrove", "Ao Thalane / Mangrove Kayak", "كاياك المنغروف", "kayak", "Ao Thalane", "Mangrove kayak activity", "Indicative mangrove kayaking activity near Krabi.", "Mangrove kayak paddle.", ["https://www.tourismthailand.org/"], "outdoor", ["kayak"]),
      A("diving-krabi", "Krabi Snorkel / Dive Outing", "سنوركل أو غوص كرابي", "snorkel", "Ao Nang / islands", "Water activity lead", "Indicative snorkel/dive outing from Krabi coast.", "Reef snorkel outing.", ["https://www.tourismthailand.org/"], "water_sports", ["snorkel"]),
      N("ao-nang-beach-bar", "Ao Nang Beach Bar lead", "بار شاطئ آو نانغ", "bar", "beach_bar", "Ao Nang", "Beach bar corridor lead", "Indicative Ao Nang beach-bar lead for sunset drinks.", "Ao Nang sunset beach bar.", ["https://www.tourismthailand.org/"], ["bar"]),
      N("railay-nightlife", "Railay Nightlife lead", "سهرات رايلاي", "bar", "beach_bar", "Railay West", "Low-key Railay nightlife lead", "Indicative low-key Railay beach nightlife lead (not Patong-scale).", "Laid-back Railay night.", ["https://www.tourismthailand.org/"], ["railay"]),
      N("ao-nang-club", "Ao Nang Nightlife Venue lead", "ملهى آو نانغ", "nightlife", "nightclub", "Ao Nang", "Small-town nightlife lead", "Indicative Ao Nang late venue lead.", "Ao Nang late night.", ["https://www.tourismthailand.org/"], ["nightlife"]),
      N("tubkaak-bar", "Tubkaak / Klong Muang Lounge lead", "لاونج توبكاك", "bar", "lounge_bar", "Tubkaak / Klong Muang", "Quiet west-coast lounge lead", "Quieter west-coast lounge/bar lead away from Ao Nang strip.", "Quiet coast evening drinks.", ["https://www.tourismthailand.org/"], ["lounge"]),
      H("rayavadee", "Rayavadee", "رايافادي", "resort", "Railay", "Iconic Railay luxury resort", "Luxury resort set among Railay’s cliffs and beaches (boat access).", "Railay cliffside luxury resort.", ["https://www.rayavadee.com/"], ["resort", "railay"]),
      H("centara-krabi", "Centara Grand Beach Resort & Villas Krabi", "سينتارا كرابي", "resort", "Krabi coastline", "Centara beach resort", "Centara Grand beach resort & villas in Krabi.", "Centara beach resort stay.", ["https://www.centarahotelsresorts.com/centaragrand/cgk"], ["resort"]),
      H("dusit-krabi", "Dusit Thani Krabi Beach Resort", "دوسيت ثاني كرابي", "resort", "Klong Muang", "Dusit beach resort", "Dusit Thani beach resort on Klong Muang.", "Klong Muang Dusit resort.", ["https://www.dusit.com/dusitthani/krabibeachresort/"], ["resort"]),
      H("anantara-golden-hills", "Banyan Tree Krabi", "بانيان تري كرابي", "resort", "Tubkaak area", "Banyan Tree Krabi resort", "Banyan Tree Krabi luxury resort lead on the west coast.", "West-coast Banyan Tree stay.", ["https://www.banyantree.com/thailand/krabi"], ["resort"]),
      H("railay-princess", "Railay Princess Resort & Spa", "رايلاي برينسيس", "resort", "Railay East", "Railay midscale resort lead", "Railay East resort lead with boat access.", "Railay boat-access resort.", ["https://www.tourismthailand.org/"], ["resort", "railay"]),
      H("ao-nang-cliff", "Ao Nang Cliff Beach Resort lead", "منتجع منحدر آو نانغ", "resort", "Ao Nang", "Ao Nang cliff resort lead", "Ao Nang cliff/beach resort staging lead.", "Ao Nang cliff resort.", ["https://www.tourismthailand.org/"], ["resort"]),
      H("holiday-inn-krabi", "Holiday Inn Resort Krabi Ao Nang Beach", "هوليداي إن آو نانغ", "hotel", "Ao Nang", "IHG Ao Nang resort", "Holiday Inn Resort on Ao Nang Beach.", "Ao Nang Holiday Inn stay.", ["https://www.ihg.com/holidayinnresorts/hotels/us/en/krabi/krbbh/hoteldetail"], ["hotel"]),
      H("phoenix-krabi", "Phoenix Digital Krabi Resort / Ao Nang hotel lead", "فينيكس كرابي", "hotel", "Ao Nang", "Ao Nang hotel lead", "Ao Nang hotel staging lead for midscale stays.", "Practical Ao Nang hotel.", ["https://www.tourismthailand.org/"], ["hotel"]),
      H("tubkaak-resort", "The Tubkaak Resort Boutique Resort Krabi", "توبكاك ريزورت", "boutique_hotel", "Tubkaak Beach", "Boutique Tubkaak beach resort", "Boutique beach resort on quieter Tubkaak Beach.", "Quiet Tubkaak boutique resort.", ["https://www.tubkaakresort.com/"], ["boutique_hotel"]),
      H("pavilion-krabi", "Pavilion Krabi Beach Resort lead", "باڤيليون كرابي", "resort", "Krabi beach belt", "Beach resort lead", "Krabi beach resort staging lead.", "Beach resort base in Krabi.", ["https://www.tourismthailand.org/"], ["resort"]),
    ],
  },

  {
    slug: "koh-phi-phi",
    nameEn: "Koh Phi Phi",
    nameAr: "كو في في",
    region: "Andaman islands / Krabi province",
    recommendedDuration: "2–4 days",
    tags: ["islands", "beach", "snorkeling", "nightlife", "maya_bay"],
    summaryEn:
      "Andaman island group centred on Phi Phi Don’s Tonsai/Ao Lo Dalam hub, with Maya Bay day visits — lodging here is not the same as Krabi mainland or Phuket.",
    summaryAr:
      "مجموعة جزر أندامان حول مركز تونساي/آو لو دالام في في في دون، مع زيارات لمايا باي — الإقامة هنا ليست كرابي البرية ولا بوكيت.",
    shortDescriptionEn:
      "Andaman island stay with beaches and boat days. Recommended stay 2–4 days.",
    geographyNote:
      "Tonsai village, Ao Lo Dalam, Long Beach, and viewpoint trails are short distances but boat-dependent to the mainland. Maya Bay is typically a regulated day visit, not a hotel base. Do not merge with Krabi or Phuket destination inventories.",
    compactPlaces: [
      R("tonsai-seafood", "Tonsai Seafood Dining lead", "مأكولات تونساي البحرية", "seafood", "Tonsai", "Village seafood dining", "Indicative Tonsai village seafood dining lead.", "Casual Tonsai seafood.", ["https://www.tourismthailand.org/"], ["seafood"]),
      R("unni", "Unni's Restaurant lead", "مطعم أوني", "international", "Tonsai", "Long-running Tonsai restaurant lead", "Popular Tonsai restaurant lead for mixed Thai/international plates.", "Tonsai village dinner.", ["https://www.tourismthailand.org/"], ["tonsai"]),
      R("madam-chicken", "Local Thai Eatery lead", "مأكل تايلاندي محلي", "thai", "Tonsai", "Local Thai eatery lead", "Indicative affordable Thai eatery lead in Tonsai.", "Simple Thai plates.", ["https://www.tourismthailand.org/"], ["thai"]),
      R("beachfront-phi-phi", "Ao Lo Dalam Beachfront Dining lead", "طعام شاطئ آو لو دالام", "beach_dining", "Ao Lo Dalam", "Beachfront dining lead", "Indicative Ao Lo Dalam beachfront dining lead.", "Dalam beachfront dinner.", ["https://www.tourismthailand.org/"], ["beach"]),
      R("le-grande", "Le Grand Bleu lead", "لو غران بلو", "french_thai", "Tonsai", "Hill/restaurant lead", "Tonsai dining lead often associated with hillside views. Confirm live status in Admin.", "Hillside Tonsai dinner.", ["https://www.tourismthailand.org/"], ["dinner"]),
      C("coffee-phi-phi", "Tonsai Coffee lead", "قهوة تونساي", "cafe", "Tonsai", "Village coffee lead", "Indicative Tonsai coffee shop lead.", "Tonsai coffee break.", ["https://www.tourismthailand.org/"], ["coffee"]),
      C("bakery-phi-phi", "Phi Phi Bakery lead", "مخبز في في", "bakery_cafe", "Tonsai", "Bakery café lead", "Indicative bakery/breakfast café lead in Tonsai.", "Breakfast bakery stop.", ["https://www.tourismthailand.org/"], ["bakery"]),
      C("smoothie-lead", "Beach Smoothie Cafe lead", "عصائر الشاطئ", "cafe", "Long Beach / Tonsai", "Smoothie café lead", "Indicative beach smoothie café lead.", "Beach smoothie pause.", ["https://www.tourismthailand.org/"], ["cafe"]),
      C("amazon-phi-phi", "Island Coffee Chain lead", "سلسلة قهوة الجزيرة", "chain_coffee", "Tonsai", "Chain/island coffee lead", "Practical coffee lead; pin exact shop in Admin.", "Easy island coffee.", ["https://www.cafeamazon.com/"], ["coffee"]),
      T("maya-bay", "Maya Bay", "خليج مايا", "bay", "Koh Phi Phi Le", "Famous bay on Phi Phi Le (day visit rules apply)", "World-famous bay on uninhabited Phi Phi Le, typically visited by day trip with conservation rules. Not a hotel base.", "Iconic Maya Bay day visit.", ["https://www.tourismthailand.org/"], "natural", ["maya_bay"]),
      T("viewpoint", "Phi Phi Viewpoint", "نقطة مشاهدة في في", "viewpoint", "Phi Phi Don ridge", "Island twin-bay viewpoint", "Ridge viewpoint overlooking Tonsai and Ao Lo Dalam.", "Twin-bay island viewpoint.", ["https://www.tourismthailand.org/"], "viewpoint", ["viewpoint"]),
      T("long-beach", "Long Beach (Hat Yao)", "لونغ بيتش", "beach", "Phi Phi Don west", "Long Beach swimming strip", "Long Beach swimming and sunbed area on Phi Phi Don.", "Long Beach swim stop.", ["https://www.tourismthailand.org/"], "natural", ["beach"]),
      A("snorkel-phi-phi", "Phi Phi Snorkeling Tour", "سنوركل في في", "snorkel", "Tonsai piers", "Snorkel boat tour", "Indicative snorkel boat tour around Phi Phi. Operator pin deferred.", "Half-day snorkel boat.", ["https://www.tourismthailand.org/"], "water_sports", ["snorkel"]),
      A("viking-cave-tour", "Viking Cave / Bamboo Island Outing", "كهف الفايكنغ / بامبو", "island_tour", "Day-boat circuit", "Classic Phi Phi boat circuit lead", "Indicative boat outing including common Phi Phi Le / Bamboo stops. Rules change; verify in Admin.", "Classic Phi Phi boat day.", ["https://www.tourismthailand.org/"], "tour", ["boat"]),
      A("diving-phi-phi", "Phi Phi Dive Experience", "غوص في في", "diving", "Tonsai dive shops", "Dive activity lead", "Indicative discover-dive or fun-dive lead from Tonsai shops.", "Introductory island dive.", ["https://www.tourismthailand.org/"], "water_sports", ["diving"]),
      A("kayak-phi-phi", "Coastal Kayak Lead", "كاياك ساحلي", "kayak", "Long Beach / Loh Dalum", "Kayak activity lead", "Indicative coastal kayak hire/tour lead.", "Paddle the bays.", ["https://www.tourismthailand.org/"], "outdoor", ["kayak"]),
      N("dalam-nightlife", "Ao Lo Dalam Nightlife Strip", "سهرات آو لو دالام", "nightlife", "beach_party", "Ao Lo Dalam", "Beach nightlife corridor", "Ao Lo Dalam beach nightlife corridor lead (fire shows / beach bars). Individual venues to curate later.", "Dalam beach party strip.", ["https://www.tourismthailand.org/"], ["nightlife"]),
      N("carlito", "Carlito's lead", "كارليتوز", "bar", "beach_bar", "Ao Lo Dalam", "Beach bar lead", "Well-known Ao Lo Dalam beach bar lead.", "Dalam beach bar night.", ["https://www.tourismthailand.org/"], ["bar"]),
      N("reggae-bar", "Reggae Bar lead", "ريغي بار", "bar", "bar", "Tonsai", "Tonsai village bar lead", "Tonsai village bar/muay Thai entertainment lead.", "Tonsai bar night.", ["https://www.tourismthailand.org/"], ["bar"]),
      N("sunflower", "Sunflower Bar lead", "صن فلاور بار", "bar", "viewpoint_bar", "Viewpoint trail", "Hillside/viewpoint bar lead", "Viewpoint-area bar lead above Tonsai.", "Sunset viewpoint bar.", ["https://www.tourismthailand.org/"], ["bar"]),
      H("zeavola", "Zeavola Resort", "زيافولا", "resort", "Laem Tong", "Quiet-end luxury resort", "Upscale resort on quieter Laem Tong beach, Phi Phi Don.", "Quiet-end Phi Phi luxury resort.", ["https://www.zeavola.com/"], ["resort"]),
      H("saii-phi-phi", "SAii Phi Phi Island Village", "ساي في في", "resort", "Laem Tong area", "SAii resort Phi Phi", "SAii Phi Phi Island Village resort lead.", "Laem Tong SAii resort.", ["https://www.saiiresorts.com/phi-phi-island-village/"], ["resort"]),
      H("phi-phi-island-cabana", "Phi Phi Island Cabana Hotel", "كابانا في في", "hotel", "Tonsai / central", "Central island hotel", "Central Phi Phi Don hotel lead near Tonsai amenities.", "Central island hotel base.", ["https://www.phiphi-cabana.com/"], ["hotel"]),
      H("outhai", "Outrigger Phi Phi Island Resort / beach resort lead", "منتجع أوتريغر في في", "resort", "Phi Phi Don", "Beach resort lead", "Beach resort staging lead on Phi Phi Don.", "Beach resort stay.", ["https://www.tourismthailand.org/"], ["resort"]),
      H("anjunabeach", "Anya Beach Resort & Spa lead", "أنيا بيتش", "resort", "Phi Phi Don", "Beach resort lead", "Anya Beach / similar midscale resort lead — confirm brand URL in Admin.", "Midscale beach resort.", ["https://www.tourismthailand.org/"], ["resort"]),
      H("villa-ibiza", "Villa Ibiza Phi Phi lead", "ڤيلا إيبيزا", "boutique_hotel", "Tonsai hills", "Boutique hillside rooms lead", "Boutique hillside lodging lead above Tonsai.", "Hillside boutique rooms.", ["https://www.tourismthailand.org/"], ["boutique_hotel"]),
      H("the-cliff", "The Cliff View Resort lead", "ذا كليف ڤيو", "hotel", "Viewpoint area", "Viewpoint-area hotel lead", "Hotel lead near the Phi Phi viewpoint trail.", "Viewpoint-area hotel.", ["https://www.tourismthailand.org/"], ["hotel"]),
      H("pp-erawan", "PP Erawan Palms Resort lead", "بي بي إيراوان", "resort", "Long Beach side", "Long Beach resort lead", "Resort lead on/near Long Beach.", "Long Beach resort base.", ["https://www.tourismthailand.org/"], ["resort"]),
      H("holiday-inn-phi-phi", "Holiday Inn Resort Phi Phi Island", "هوليداي إن في في", "resort", "Laem Tong", "IHG Phi Phi resort", "Holiday Inn Resort on Phi Phi’s Laem Tong beach.", "Laem Tong Holiday Inn stay.", ["https://www.ihg.com/holidayinnresorts/hotels/us/en/phi-phi-island/phypb/hoteldetail"], ["resort"]),
      H("matanee", "Matanee Resort lead", "ماتاني ريزورت", "hotel", "Tonsai", "Tonsai hotel lead", "Practical Tonsai hotel staging lead.", "Simple Tonsai hotel.", ["https://www.tourismthailand.org/"], ["hotel"]),
    ],
  },

  {
    slug: "pattaya",
    nameEn: "Pattaya",
    nameAr: "باتايا",
    region: "Eastern Gulf of Thailand",
    recommendedDuration: "3–5 days",
    tags: ["beach", "nightlife", "family", "gulf", "day_trips"],
    summaryEn:
      "Gulf coast city for beach days, family attractions, and nightlife — distinct from Bangkok and Andaman destinations.",
    summaryAr:
      "مدينة على خليج تايلاند لأيام الشاطئ وعائلات وسهرات — متميزة عن بانكوك ووجهات أندامان.",
    shortDescriptionEn:
      "Eastern Gulf beach city break. Recommended stay 3–5 days.",
    geographyNote:
      "Central Pattaya, Jomtien, Naklua/Wongamat, and outlying islands (e.g. Koh Larn day trips) are separate clusters. Do not treat Pattaya as interchangeable with Bangkok.",
    compactPlaces: [
      R("mantra", "Mantra Restaurant & Bar", "مانترا", "international", "Wongamat / north", "Large international dining venue", "Large north Pattaya international restaurant and bar lead.", "Big-night international dining.", ["https://www.mantra-pattaya.com/"], ["international"]),
      R("glass-house", "The Glass House by the Pier", "ذا غلاس هاوس", "seafood", "Naklua / north", "Pier seafood dining", "North Pattaya pier seafood dining lead.", "Pier seafood dinner.", ["https://www.tourismthailand.org/"], ["seafood"]),
      R("jomtien-seafood", "Jomtien Seafood lead", "مأكولات جومتين", "seafood", "Jomtien", "Jomtien beach seafood", "Indicative Jomtien beach seafood dining lead.", "Jomtien seafood plates.", ["https://www.tourismthailand.org/"], ["seafood"]),
      R("indian-pattaya", "Central Pattaya Indian / international lead", "مطبخ عالمي باتايا", "international", "Central Pattaya", "International dining lead", "Indicative central Pattaya international dining lead.", "Central international dinner.", ["https://www.tourismthailand.org/"], ["international"]),
      R("thai-pattaya", "Local Thai Restaurant lead", "مطعم تايلاندي محلي", "thai", "Naklua / central", "Local Thai dining lead", "Indicative local Thai restaurant lead away from Walking Street.", "Local Thai dinner.", ["https://www.tourismthailand.org/"], ["thai"]),
      C("after-you-pattaya", "After You Pattaya lead", "أفتر يو باتايا", "dessert_cafe", "Central / mall", "Dessert café brand lead", "After You dessert café brand lead in Pattaya retail areas.", "Dessert café stop.", ["https://www.afteryoudessertcafe.com/"], ["dessert"]),
      C("amazon-pattaya", "Café Amazon Pattaya lead", "كافيه أمازون باتايا", "chain_coffee", "City-wide", "Chain coffee lead", "Café Amazon practical coffee lead; pin branch in Admin.", "Easy coffee stop.", ["https://www.cafeamazon.com/"], ["coffee"]),
      C("jomtien-cafe", "Jomtien Beach Cafe lead", "مقهى جومتين", "cafe", "Jomtien", "Beach café lead", "Indicative Jomtien beach café/brunch lead.", "Jomtien beach café.", ["https://www.tourismthailand.org/"], ["cafe"]),
      C("avani-cafe", "Hotel lobby café lead", "مقهى فندقي", "cafe", "Wongamat / north", "Resort café lead", "Indicative north Pattaya resort café lead for quieter coffee.", "Quiet resort coffee.", ["https://www.tourismthailand.org/"], ["coffee"]),
      T("walking-street", "Walking Street", "ووكينغ ستريت", "nightlife_district", "South Pattaya", "Famous nightlife street (attraction/district)", "Pattaya’s famous night entertainment street. Treat as a district attraction; individual venues curated separately where listed.", "Iconic nightlife district stroll.", ["https://www.tourismthailand.org/"], "other", ["nightlife_district"]),
      T("sanctuary-of-truth", "Sanctuary of Truth", "محراب الحقيقة", "wooden_temple", "Naklua / north", "Hand-carved wooden temple landmark", "Vast wooden sanctuary landmark in north Pattaya/Naklua.", "Intricate wooden temple visit.", ["https://www.tourismthailand.org/"], "cultural", ["landmark"]),
      T("koh-larn", "Koh Larn (Coral Island)", "كو لان", "island", "Offshore day trip", "Island day trip from Pattaya", "Popular gulf island day trip for beaches and water sports. Not a separate Helm destination in V1.", "Coral Island beach day.", ["https://www.tourismthailand.org/"], "natural", ["island"]),
      A("pattaya-park", "Pattaya Park Tower / family activity lead", "باتايا بارك", "family_activity", "Southern outskirts", "Family activity lead", "Indicative family amusement/tower activity lead.", "Family park activity.", ["https://www.tourismthailand.org/"], "other", ["family"]),
      A("diving-pattaya", "Pattaya / Koh Larn Dive or Snorkel", "غوص باتايا", "diving", "Pier departures", "Water sports lead", "Indicative dive/snorkel outing toward wrecks or Koh Larn.", "Gulf snorkel or dive day.", ["https://www.tourismthailand.org/"], "water_sports", ["diving"]),
      A("alcazar", "Alcazar Cabaret Show", "عرض ألكازار", "show", "Central Pattaya", "Cabaret theatre show", "Famous Pattaya cabaret show lead. Showtimes unverified in staging.", "Classic cabaret night.", ["https://www.alcazarthailand.com/"], "other", ["show"]),
      A("cooking-pattaya", "Pattaya Thai Cooking Class", "دورة طبخ باتايا", "cooking_class", "City-wide", "Cooking class lead", "Indicative Thai cooking class activity in/near Pattaya.", "Hands-on Thai cooking.", ["https://www.tourismthailand.org/"], "other", ["cooking"]),
      N("walking-street-bar", "Walking Street Club lead", "نادي ووكينغ ستريت", "nightlife", "nightclub", "Walking Street", "Club lead on Walking Street", "Indicative Walking Street club/venue lead.", "Walking Street club night.", ["https://www.tourismthailand.org/"], ["nightlife"]),
      N("horizon", "Horizon Rooftop Bar lead", "هورايزون رووف توب", "bar", "rooftop_bar", "Central / beach road hotels", "Rooftop bar lead", "Indicative Pattaya rooftop bar lead for skyline/sea views.", "Rooftop sunset drinks.", ["https://www.tourismthailand.org/"], ["rooftop"]),
      N("jomtien-nightlife", "Jomtien Nightlife lead", "سهرات جومتين", "bar", "beach_bar", "Jomtien", "Quieter beach nightlife lead", "Indicative Jomtien beach-bar nightlife lead vs Walking Street intensity.", "Laid-back Jomtien night.", ["https://www.tourismthailand.org/"], ["jomtien"]),
      N("tiffany", "Tiffany's Show vicinity nightlife lead", "تيفاني شو", "nightlife", "cabaret_district", "North/central Pattaya", "Cabaret-district nightlife lead", "Cabaret-show district nightlife lead (complementary to Alcazar activity).", "Cabaret district night out.", ["https://www.tourismthailand.org/"], ["show", "nightlife"]),
      H("hilton-pattaya", "Hilton Pattaya", "هيلتون باتايا", "hotel", "Central Beach Road", "Beachfront Hilton", "Hilton Pattaya on Central Beach Road.", "Central beachfront Hilton.", ["https://www.hilton.com/en/hotels/phhhihi-hilton-pattaya/"], ["hotel"]),
      H("marriott-pattaya", "Pattaya Marriott Resort & Spa", "ماريوت باتايا", "resort", "Wongamat / north", "North Pattaya Marriott resort", "Marriott resort on quieter north Pattaya/Wongamat beach.", "North beach Marriott resort.", ["https://www.marriott.com/en-us/hotels/pyxmz-pattaya-marriott-resort-and-spa/overview/"], ["resort"]),
      H("intercontinental-pattaya", "InterContinental Pattaya Resort", "إنتركونتيننتال باتايا", "resort", "South / Cape", "Cliff/cove InterContinental", "InterContinental Pattaya Resort in a cove south of centre.", "Cove InterContinental resort.", ["https://www.ihg.com/intercontinental/hotels/us/en/pattaya/pyxha/hoteldetail"], ["resort"]),
      H("woodlands", "Woodlands Resort Pattaya", "وودلاندز", "resort", "Central/north gardens", "Garden resort lead", "Garden-set Woodlands Resort Pattaya lead.", "Garden resort stay.", ["https://www.woodland-resort.com/"], ["resort"]),
      H("amari-pattaya", "Amari Pattaya", "أماري باتايا", "hotel", "Beach Road", "Amari beach hotel", "Amari hotel on Pattaya Beach Road.", "Beach Road Amari stay.", ["https://www.amari.com/pattaya"], ["hotel"]),
      H("centara-pattaya", "Centara Grand Mirage Beach Resort Pattaya", "سينتارا ميراج", "resort", "Wongamat", "Family fantasy resort", "Family-oriented Centara Grand Mirage resort in Wongamat.", "Family Mirage resort.", ["https://www.centarahotelsresorts.com/centaragrand/cgmp"], ["resort", "family"]),
      H("pullman-pattaya", "Pullman Pattaya Hotel G", "بولمان باتايا", "hotel", "Central beach", "Pullman beach hotel", "Pullman Pattaya Hotel G on the central beachfront.", "Central Pullman stay.", ["https://www.pullmanpattayahotelg.com/"], ["hotel"]),
      H("avonova", "Avani+ Riverside Bangkok is wrong — Avani Pattaya Resort", "أڤاني باتايا", "resort", "Wongamat", "Avani Pattaya resort", "Avani Pattaya Resort on Wongamat beach.", "Wongamat Avani resort.", ["https://www.avanihotels.com/en/pattaya"], ["resort"]),
      H("hard-rock-pattaya", "Hard Rock Hotel Pattaya", "هارد روك باتايا", "hotel", "Beach Road", "Hard Rock beach hotel", "Hard Rock Hotel on Pattaya Beach Road.", "Beach Road Hard Rock stay.", ["https://www.hardrockhotels.com/pattaya/"], ["hotel"]),
      H("jomtien-hotel", "Seaview Jomtien Hotel lead", "فندق جومتين", "hotel", "Jomtien", "Jomtien hotel lead", "Practical Jomtien beach hotel staging lead.", "Jomtien beach hotel.", ["https://www.tourismthailand.org/"], ["hotel", "jomtien"]),
    ],
  },
];
