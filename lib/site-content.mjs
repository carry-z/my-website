const legacyArchitecturePhotos = [
  ["湖南大学校碑", "/images/photography/architecture/hunan_university_stone_sign.jpg"],
  ["特藏分馆", "/images/photography/architecture/hunan_university_red_building_front.jpg"],
  ["东方红广场", "/images/photography/architecture/campus_statue_square.jpg"],
  ["冬日的爱晚亭", "/images/photography/architecture/aiwan_pavilion_winter.jpg"],
  ["大成殿建筑", "/images/photography/architecture/dacheng_hall.jpg"],
  ["孔庙", "/images/photography/architecture/hunan_university_courtyard.jpg"],
  ["沁园春长沙诗词", "/images/photography/architecture/hunan_university_gate.jpg"],
  ["绿荫红楼", "/images/photography/architecture/red_brick_building_garden.jpg"],
  ["红砖建筑", "/images/photography/architecture/red_brick_building.jpg"],
  ["书院雪景", "/images/photography/architecture/seek_truth_building.jpg"],
  ["秋日操场", "/images/photography/architecture/sports_field_autumn.jpg"],
  ["岳麓书院大门", "/images/photography/architecture/yuelu_academy_entrance.jpg"],
  ["春日岳麓书院", "/images/photography/architecture/yuelu_academy_spring_gate.jpg"],
  ["岳麓书院正门", "/images/photography/architecture/yuelu_academy_front_wide.jpg"],
  ["岳麓书院门庭", "/images/photography/architecture/yuelu_academy_gate_layers.jpg"],
  ["书院讲堂前坪", "/images/photography/architecture/yuelu_academy_hall_courtyard.jpg"],
  ["御书阁", "/images/photography/architecture/yuelu_academy_tree_framed_hall.jpg"],
  ["时物轩", "/images/photography/architecture/yuelu_academy_sunny_roofline.jpg"],
  ["胜利斋", "/images/photography/architecture/campus_rooftop_courtyard.jpg"],
  ["山景校园庭院", "/images/photography/architecture/campus_courtyard_mountain_view.jpg"],
  ["自卑亭", "/images/photography/architecture/zibei_pavilion.jpg"],
  ["樱花与现代建筑", "/images/photography/nature/cherry_blossoms_modern_building.jpg"],
  ["林中的传统建筑", "/images/photography/nature/traditional_buildings_forest.jpg"],
];

const legacyNaturePhotos = [
  ["桂花与屋檐", "/images/photography/nature/osmanthus_roof_bokeh.jpg"],
  ["春日紫藤", "/images/photography/nature/wisteria_spring.jpg"],
  ["粉色樱花", "/images/photography/nature/pink_cherry_blossoms.jpg"],
  ["粉色花朵与建筑", "/images/photography/nature/pink_blossoms_building.jpg"],
  ["梅花特写", "/images/photography/nature/plum_blossoms_closeup.jpg"],
  ["黄色花朵与墙面", "/images/photography/nature/yellow_flowers_wall.jpg"],
];

export const categories = ["建筑", "自然", "其他"];
const builtinPhotos = [legacyArchitecturePhotos, legacyNaturePhotos].flatMap((photos, category) =>
  photos.map(([caption, src], index) => ({ id: `original-${category}-${index}`, caption, category: categories[category], src })),
);
export const originalPhotoSources = Object.freeze(Object.fromEntries(builtinPhotos.map(({ id, src }) => [id, src])));
export const originalPaperId = "original-jacs";
export const defaultSiteContent = {
  intro: "你好，我是 Carry。这里收录我的科研探索、文字思考与摄影作品，也记录我理解世界的方式。",
  photos: builtinPhotos.map(({ src, ...entry }) => entry),
  papers: [{
    id: originalPaperId, title: "JACS 代表性论文", authors: "", venue: "", year: "",
    summary: "点击进入期刊页面，查看论文摘要与完整内容。",
    link: "https://pubs.acs.org/doi/10.1021/jacs.5c17758",
  }],
};
export const photoUrl = (photo, preview = false) => photo.asset
  ? `/api/site-media/${photo.asset}${preview ? "?preview=1" : ""}`
  : originalPhotoSources[photo.id];
