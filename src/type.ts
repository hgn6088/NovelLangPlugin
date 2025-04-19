// 소설 요소들을 저장할 데이터 구조
export interface Character {
  name: string;
  age?: number;
  description?: string;
  traits?: string[];
  locations?: Set<string>; // 캐릭터가 등장한 위치
  timeline?: Map<string, string>; // 시간별 캐릭터 상태
}

export interface Setting {
  name: string;
  location: string;
  time?: string;
  description?: string;
}

export interface Event {
  name: string;
  time?: string;
  participants?: string[];
  description?: string;
  consequences?: string[];
}

export interface NovelData {
  characters: Map<string, Character>;
  settings: Map<string, Setting>;
  events: Map<string, Event>;
  timeline: Map<string, Set<string>>; // 시간별 이벤트
}
