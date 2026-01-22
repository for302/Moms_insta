import { useState } from "react";
import { Star, Search, Loader2 } from "lucide-react";
import { useSettingsStore } from "@/stores/settingsStore";
import { useSystemFonts } from "@/hooks/useSystemFonts";

// 영문 폰트명 → 한글 표시명 매핑
const koreanFontNames: Record<string, string> = {
  // 네이버 폰트
  "Nanum Gothic": "나눔고딕",
  "NanumGothic": "나눔고딕",
  "Nanum Myeongjo": "나눔명조",
  "NanumMyeongjo": "나눔명조",
  "Nanum Pen Script": "나눔펜",
  "NanumPenScript": "나눔펜",
  "Nanum Brush Script": "나눔브러쉬",
  "NanumBrushScript": "나눔브러쉬",
  "Nanum Square": "나눔스퀘어",
  "NanumSquare": "나눔스퀘어",
  "Nanum Square Round": "나눔스퀘어라운드",
  "NanumSquareRound": "나눔스퀘어라운드",
  "Nanum Barun Gothic": "나눔바른고딕",
  "NanumBarunGothic": "나눔바른고딕",
  "Nanum Barun Pen": "나눔바른펜",
  "NanumBarunPen": "나눔바른펜",
  // 구글 폰트
  "Noto Sans KR": "노토 산스",
  "Noto Sans Korean": "노토 산스",
  "Noto Serif KR": "노토 세리프",
  "Noto Serif Korean": "노토 세리프",
  // 카카오 폰트
  "KoPubWorld Dotum": "코퍼브돋움",
  "KoPub Dotum": "코퍼브돋움",
  "KoPubWorld Batang": "코퍼브바탕",
  "KoPub Batang": "코퍼브바탕",
  // 배달의민족 폰트
  "BMDOHYEON": "배민 도현체",
  "BMHANNAPro": "배민 한나체 Pro",
  "BMHANNA": "배민 한나체",
  "BMJUA": "배민 주아체",
  "BMYEONSUNG": "배민 연성체",
  "BMKIRANGHAERANG": "배민 기랑해랑체",
  "BMEULJIRO": "배민 을지로체",
  "BMEULJIRO10YEARSLATER": "배민 을지로10년후체",
  // 기타 한글 폰트
  "Pretendard": "프리텐다드",
  "Spoqa Han Sans": "스포카 한 산스",
  "Spoqa Han Sans Neo": "스포카 한 산스 네오",
  "SpoqaHanSans": "스포카 한 산스",
  "SpoqaHanSansNeo": "스포카 한 산스 네오",
  "Gmarket Sans": "지마켓 산스",
  "GmarketSans": "지마켓 산스",
  "Malgun Gothic": "맑은 고딕",
  "MalgunGothic": "맑은 고딕",
  "Gulim": "굴림",
  "Dotum": "돋움",
  "Batang": "바탕",
  "Gungsuh": "궁서",
  "Apple SD Gothic Neo": "애플 SD 고딕 Neo",
  "AppleSDGothicNeo": "애플 SD 고딕 Neo",
  "Apple Myungjo": "애플 명조",
  "AppleMyungjo": "애플 명조",
  // 산돌 폰트
  "Sandoll Gothic": "산돌 고딕",
  "Sandoll Myungjo": "산돌 명조",
  // 윤고딕
  "Yoon Gothic": "윤고딕",
  "YoonGothic": "윤고딕",
  // 티몬 폰트
  "Tmon Monsori": "티몬 몬소리",
  "TmonMonsori": "티몬 몬소리",
  // 넥슨 폰트
  "Nexon Lv1 Gothic": "넥슨 Lv1 고딕",
  "Nexon Lv2 Gothic": "넥슨 Lv2 고딕",
  // 기타
  "Jeju Gothic": "제주 고딕",
  "JejuGothic": "제주 고딕",
  "Jeju Myeongjo": "제주 명조",
  "JejuMyeongjo": "제주 명조",
  "Jeju Hallasan": "제주 한라산",
  "JejuHallasan": "제주 한라산",
  "D2Coding": "D2 코딩",
  "Cafe24 Ssurround": "카페24 써라운드",
  "Cafe24Ssurround": "카페24 써라운드",
  "LINE Seed": "라인 시드",
  "LINESeed": "라인 시드",
  "Wanted Sans": "원티드 산스",
  "WantedSans": "원티드 산스",
  // 페이퍼로지 폰트
  "Paperlogy": "페이퍼로지",
  "Paperlogy Thin": "페이퍼로지 Thin",
  "Paperlogy ExtraLight": "페이퍼로지 ExtraLight",
  "Paperlogy Light": "페이퍼로지 Light",
  "Paperlogy Medium": "페이퍼로지 Medium",
  "Paperlogy SemiBold": "페이퍼로지 SemiBold",
  "Paperlogy Bold": "페이퍼로지 Bold",
  "Paperlogy ExtraBold": "페이퍼로지 ExtraBold",
  "Paperlogy Black": "페이퍼로지 Black",
};

// 한글 표시명 가져오기
function getDisplayName(fontName: string): string {
  // 정확히 매칭되는 한글 이름이 있으면 반환
  if (koreanFontNames[fontName]) {
    return koreanFontNames[fontName];
  }
  // 부분 매칭 시도 (예: "Nanum Gothic Bold" → "나눔고딕")
  for (const [eng, kor] of Object.entries(koreanFontNames)) {
    if (fontName.startsWith(eng) || fontName.includes(eng)) {
      return kor;
    }
  }
  return fontName;
}

// 검색 시 한글명도 포함
function matchesSearch(fontName: string, query: string): boolean {
  const lowerQuery = query.toLowerCase();
  const lowerFont = fontName.toLowerCase();
  const displayName = getDisplayName(fontName).toLowerCase();

  return lowerFont.includes(lowerQuery) || displayName.includes(lowerQuery);
}

export default function FontSettings() {
  const { favoriteFonts, toggleFavoriteFont } = useSettingsStore();
  const { fonts, isLoading, error } = useSystemFonts();
  const [searchQuery, setSearchQuery] = useState("");

  // Filter fonts based on search query (영문 및 한글명 검색)
  const filteredFonts = fonts.filter((font) =>
    matchesSearch(font, searchQuery)
  );

  // Separate favorites and non-favorites
  const favoriteFontsList = filteredFonts.filter((font) =>
    favoriteFonts.includes(font)
  );
  const otherFontsList = filteredFonts.filter(
    (font) => !favoriteFonts.includes(font)
  );

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">
        배치 편집에서 사용할 폰트를 즐겨찾기에 추가하세요. 즐겨찾기한 폰트만 표시할 수 있습니다.
      </p>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="폰트 검색..."
          className="input pl-10 w-full"
        />
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-gray-600">
        <span>전체 폰트: {fonts.length}개</span>
        <span className="text-yellow-600">
          <Star className="w-4 h-4 inline mr-1 fill-yellow-400" />
          즐겨찾기: {favoriteFonts.length}개
        </span>
      </div>

      {/* Loading/Error states */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500">폰트 불러오는 중...</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Font List */}
      {!isLoading && (
        <div className="space-y-4 max-h-[calc(100vh-400px)] overflow-y-auto">
          {/* Favorites Section */}
          {favoriteFontsList.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-400" />
                즐겨찾기 ({favoriteFontsList.length})
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {favoriteFontsList.map((font) => (
                  <FontItem
                    key={font}
                    font={font}
                    isFavorite={true}
                    onToggle={() => toggleFavoriteFont(font)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Other Fonts Section */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              {favoriteFontsList.length > 0 ? "기타 폰트" : "전체 폰트"} ({otherFontsList.length})
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {otherFontsList.map((font) => (
                <FontItem
                  key={font}
                  font={font}
                  isFavorite={false}
                  onToggle={() => toggleFavoriteFont(font)}
                />
              ))}
            </div>
          </div>

          {/* No results */}
          {filteredFonts.length === 0 && searchQuery && (
            <div className="text-center py-8 text-gray-500">
              "{searchQuery}"에 해당하는 폰트가 없습니다.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface FontItemProps {
  font: string;
  isFavorite: boolean;
  onToggle: () => void;
}

function FontItem({ font, isFavorite, onToggle }: FontItemProps) {
  const displayName = getDisplayName(font);
  const hasKoreanName = displayName !== font;

  return (
    <div
      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
        isFavorite
          ? "border-yellow-300 bg-yellow-50 hover:bg-yellow-100"
          : "border-gray-200 bg-white hover:bg-gray-50"
      }`}
      onClick={onToggle}
    >
      <button
        className={`p-1 rounded transition-colors flex-shrink-0 ${
          isFavorite ? "text-yellow-500" : "text-gray-300 hover:text-yellow-400"
        }`}
      >
        <Star
          className={`w-4 h-4 ${isFavorite ? "fill-yellow-400" : ""}`}
        />
      </button>
      <div className="flex-1 min-w-0">
        {/* 한글명 (매핑된 경우) 또는 영문명 */}
        <div className="flex items-center gap-1.5">
          <span
            className="text-sm font-medium text-gray-800 truncate"
            style={{ fontFamily: font }}
            title={font}
          >
            {displayName}
          </span>
          {hasKoreanName && (
            <span className="text-[10px] text-gray-400 flex-shrink-0">
              ({font})
            </span>
          )}
        </div>
        {/* 한글 미리보기 샘플 */}
        <div
          className="text-xs text-gray-500 truncate"
          style={{ fontFamily: font }}
        >
          가나다라 마바사 123 ABC
        </div>
      </div>
    </div>
  );
}
