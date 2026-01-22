// Layout Editor Constants

// Grid settings - 5px on actual image
export const GRID_PX = 5;

// Available font options for text elements
export const fontOptions = [
  // 한글 폰트
  "Paperlogy",
  "Paperlogy Thin",
  "Paperlogy ExtraLight",
  "Paperlogy Light",
  "Paperlogy Medium",
  "Paperlogy SemiBold",
  "Paperlogy Bold",
  "Paperlogy ExtraBold",
  "Paperlogy Black",
  "Pretendard",
  "Noto Sans KR",
  "Noto Serif KR",
  "Nanum Gothic",
  "Nanum Myeongjo",
  "Nanum Pen Script",
  "Nanum Brush Script",
  "Spoqa Han Sans Neo",
  "IBM Plex Sans KR",
  "Gothic A1",
  "Black Han Sans",
  "Do Hyeon",
  "Jua",
  "Gamja Flower",
  "Gaegu",
  "Hi Melody",
  "Poor Story",
  "Single Day",
  "Sunflower",
  "Cute Font",
  "East Sea Dokdo",
  // 영문 폰트
  "Arial",
  "Helvetica",
  "Georgia",
  "Times New Roman",
  "Verdana",
  "Roboto",
  "Open Sans",
  "Montserrat",
  "Lato",
  "Poppins",
];

// Element type order for z-index sorting
export const ELEMENT_TYPE_ORDER = {
  background: 0,
  shape: 1,
  image: 2,
  text: 3,
} as const;
