// Showcase verses for the landing page, login and footer, copied word for word from each bundled Bible
// (never written by AI). Generated from data/bibles; English from KJV/BSB.
import type { Locale } from "./config";

type V = { ref: string; text: string; bible?: string };
export const SHOWCASE: Record<Locale, { bible: string; ps119: V; rom828: V; ps231: V; isa4319: V }> = {
  "en": {
    "bible": "KJV",
    "ps119": {
      "ref": "Psalm 119:105",
      "text": "Thy word is a lamp unto my feet, and a light unto my path."
    },
    "rom828": {
      "ref": "Romans 8:28",
      "text": "And we know that God works all things together for the good of those who love Him, who are called according to His purpose.",
      "bible": "BSB"
    },
    "ps231": {
      "ref": "Psalm 23:1",
      "text": "The LORD is my shepherd; I shall not want."
    },
    "isa4319": {
      "ref": "Isaiah 43:19",
      "text": "Behold, I am about to do something new; even now it springs up—do you not see it?",
      "bible": "BSB"
    }
  },
  "fr": {
    "bible": "LSG",
    "ps119": {
      "ref": "Psaumes 119:105",
      "text": "Ta parole est une lampe à mes pieds, Et une lumière sur mon sentier."
    },
    "rom828": {
      "ref": "Romains 8:28",
      "text": "Nous savons, du reste, que toutes choses concourent au bien de ceux qui aiment Dieu, de ceux qui sont appelés selon son dessein."
    },
    "ps231": {
      "ref": "Psaumes 23:1",
      "text": "Cantique de David. L'Eternel est mon berger: je ne manquerai de rien."
    },
    "isa4319": {
      "ref": "Ésaïe 43:19",
      "text": "Voici, je vais faire une chose nouvelle, sur le point d'arriver: Ne la connaîtrez-vous pas? Je mettrai un chemin dans le désert, Et des fleuves dans la solitude."
    }
  },
  "es": {
    "bible": "RV1909",
    "ps119": {
      "ref": "Salmos 119:105",
      "text": "Lámpara es á mis pies tu palabra, y lumbrera á mi camino."
    },
    "rom828": {
      "ref": "Romanos 8:28",
      "text": "Y sabemos que á los que á Dios aman, todas las cosas les ayudan á bien, es á saber, á los que conforme al propósito son llamados."
    },
    "ps231": {
      "ref": "Salmos 23:1",
      "text": "Salmo de David. JEHOVÁ es mi pastor; nada me faltará."
    },
    "isa4319": {
      "ref": "Isaías 43:19",
      "text": "He aquí que yo hago cosa nueva: presto saldrá á luz: ¿no la sabréis? Otra vez pondré camino en el desierto, y ríos en la soledad."
    }
  },
  "pt": {
    "bible": "BLIVRE",
    "ps119": {
      "ref": "Salmos 119:105",
      "text": "Tua palavra é lâmpada para meus pés e luz para meu caminho."
    },
    "rom828": {
      "ref": "Romanos 8:28",
      "text": "E sabemos que todas as coisas juntamente contribuem para o bem daqueles que amam a Deus, dos que são chamados segundo o seu propósito."
    },
    "ps231": {
      "ref": "Salmos 23:1",
      "text": "Salmo de Davi: O SENHOR é meu pastor, nada me faltará."
    },
    "isa4319": {
      "ref": "Isaías 43:19",
      "text": "Eis que farei uma coisa nova, agora surgirá; por acaso não a reconhecereis? Pois porei um caminho no deserto, [e] rios na terra vazia."
    }
  },
  "sw": {
    "bible": "SWC",
    "ps119": {
      "ref": "Zaburi 119:105",
      "text": "Neno lako ni taa ya miguu yangu na mwanga katika njia yangu."
    },
    "rom828": {
      "ref": "Warumi 8:28",
      "text": "Nasi tunajua ya kuwa katika mambo yote Mungu hutenda kazi pamoja na wote wampendao, katika kuwapatia mema, yaani, wale walioitwa kwa kusudi lake."
    },
    "ps231": {
      "ref": "Zaburi 23:1",
      "text": "Bwana ndiye mchungaji wangu, sitapungukiwa na kitu."
    },
    "isa4319": {
      "ref": "Isaya 43:19",
      "text": "Tazama, nitafanya jambo jipya! Sasa litachipuka, je, hamtalitambua? Nitafanya njia jangwani na vijito vya maji katika nchi kame."
    }
  },
  "ko": {
    "bible": "KRV",
    "ps119": {
      "ref": "시편 119:105",
      "text": "주의 말씀은 내 발에 등이요 내 길에 빛이니이다"
    },
    "rom828": {
      "ref": "로마서 8:28",
      "text": "우리가 알거니와 하나님을 사랑하는 자 곧 그 뜻대로 부르심을 입은 자들에게는 모든 것이 합력하여 선을 이루느니라"
    },
    "ps231": {
      "ref": "시편 23:1",
      "text": "여호와는 나의 목자시니 내가 부족함이 없으리로다"
    },
    "isa4319": {
      "ref": "이사야 43:19",
      "text": "보라 내가 새 일을 행하리니 이제 나타낼 것이라 너희가 그것을 알지 못하겠느냐 정녕히 내가 광야에 길과 사막에 강을 내리니"
    }
  },
  "zh": {
    "bible": "CUVS",
    "ps119": {
      "ref": "诗篇 119:105",
      "text": "你的话是我脚前的灯， 是我路上的光。"
    },
    "rom828": {
      "ref": "罗马书 8:28",
      "text": "我们晓得万事都互相效力，叫爱 神的人得益处，就是按他旨意被召的人。"
    },
    "ps231": {
      "ref": "诗篇 23:1",
      "text": "大卫的诗。 耶和华是我的牧者， 我必不致缺乏。"
    },
    "isa4319": {
      "ref": "以赛亚书 43:19",
      "text": "看哪，我要做一件新事； 如今要发现，你们岂不知道吗？ 我必在旷野开道路， 在沙漠开江河。"
    }
  }
};
