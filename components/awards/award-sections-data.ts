import type { AwardSlug } from "@/lib/navigation/routes";

export type AwardPrize = {
  value: string;
  /** Caption under the value, absent on Best Manager and MVP in the Figma. */
  note?: string;
};

export type AwardSectionData = {
  slug: AwardSlug;
  /** Label in the category menu (C.1-C.6); differs from `title` only for MVP. */
  navLabel: string;
  title: string;
  /** One entry per Figma paragraph (the Figma text uses a double space as the break). */
  paragraphs: readonly string[];
  /** Signature is left aligned in the Figma, every other description is justified. */
  alignLeft?: boolean;
  quantity: { value: string; unit: string };
  prizes: readonly AwardPrize[];
};

/*
 * Copy verbatim from the Figma text nodes of "Hệ thống giải" (MoMorph zFYDgyj_pD), cards D.1-D.6
 * (mm:313:8467, 313:8468, 313:8469, 313:8470, 313:8471, 313:8510) and menu items C.1-C.6.
 * Quantity unit of Top Talent is "Cá nhân" in the Figma (mm:I313:8467;214:3532), not "Đơn vị".
 */
export const AWARD_SECTIONS: readonly AwardSectionData[] = [
  {
    slug: "top-talent",
    navLabel: "Top Talent",
    title: "Top Talent",
    paragraphs: [
      "Giải thưởng Top Talent vinh danh những cá nhân xuất sắc toàn diện – những người không ngừng khẳng định năng lực chuyên môn vững vàng, hiệu suất công việc vượt trội, luôn mang lại giá trị vượt kỳ vọng, được đánh giá cao bởi khách hàng và đồng đội. Với tinh thần sẵn sàng nhận mọi nhiệm vụ tổ chức giao phó, họ luôn là nguồn cảm hứng, thúc đẩy động lực và tạo ảnh hưởng tích cực đến cả tập thể.",
    ],
    quantity: { value: "10", unit: "Cá nhân" },
    prizes: [{ value: "7.000.000 VNĐ", note: "cho mỗi giải thưởng" }],
  },
  {
    slug: "top-project",
    navLabel: "Top Project",
    title: "Top Project",
    paragraphs: [
      "Giải thưởng Top Project vinh danh các tập thể dự án xuất sắc với kết quả kinh doanh vượt kỳ vọng, hiệu quả vận hành tối ưu và tinh thần làm việc tận tâm. Đây là các dự án có độ phức tạp kỹ thuật cao, hiệu quả tối ưu hóa nguồn lực và chi phí tốt, đề xuất các ý tưởng có giá trị cho khách hàng, đem lại lợi nhuận vượt trội và nhận được phản hồi tích cực từ khách hàng. Các thành viên tuân thủ nghiêm ngặt các tiêu chuẩn phát triển nội bộ trong phát triển dự án, tạo nên một hình mẫu về sự xuất sắc và chuyên nghiệp.",
    ],
    quantity: { value: "02", unit: "Tập thể" },
    prizes: [{ value: "15.000.000 VNĐ", note: "cho mỗi giải thưởng" }],
  },
  {
    slug: "top-project-leader",
    navLabel: "Top Project Leader",
    title: "Top Project Leader",
    paragraphs: [
      "Giải thưởng Top Project Leader vinh danh những nhà quản lý dự án xuất sắc – những người hội tụ năng lực quản lý vững vàng, khả năng truyền cảm hứng mạnh mẽ, và tư duy “Aim High – Be Agile” trong mọi bài toán và bối cảnh. Dưới sự dẫn dắt của họ, các thành viên không chỉ cùng nhau vượt qua thử thách và đạt được mục tiêu đề ra, mà còn giữ vững ngọn lửa nhiệt huyết, tinh thần Wasshoi, và trưởng thành để trở thành phiên bản tinh hoa – hạnh phúc hơn của chính mình.",
    ],
    quantity: { value: "03", unit: "Cá nhân" },
    prizes: [{ value: "7.000.000 VNĐ", note: "cho mỗi giải thưởng" }],
  },
  {
    slug: "best-manager",
    navLabel: "Best Manager",
    title: "Best Manager",
    paragraphs: [
      "Giải thưởng Best Manager vinh danh những nhà lãnh đạo tiêu biểu – người đã dẫn dắt đội ngũ của mình tạo ra kết quả vượt kỳ vọng, tác động nổi bật đến hiệu quả kinh doanh và sự phát triển bền vững của tổ chức. Dưới sự lãnh đạo của họ, đội ngũ luôn chinh phục và làm chủ mọi mục tiêu bằng năng lực đa nhiệm, khả năng phối hợp hiệu quả, và tư duy ứng dụng công nghệ linh hoạt trong kỷ nguyên số. Họ truyền cảm hứng để tập thể trở nên tự tin tràn đầy năng lượng, sẵn sàng đón nhận, thậm chí dẫn dắt tạo ra những thay đổi có tính cách mạng.",
    ],
    quantity: { value: "01", unit: "Cá nhân" },
    prizes: [{ value: "10.000.000 VNĐ" }],
  },
  {
    slug: "signature-2025-creator",
    navLabel: "Signature 2025 - Creator",
    title: "Signature 2025 - Creator",
    paragraphs: [
      "Giải thưởng Signature vinh danh cá nhân hoặc tập thể thể hiện tinh thần đặc trưng mà Sun* hướng tới trong từng thời kỳ.",
      "Trong năm 2025, giải thưởng Signature vinh danh Creator - cá nhân/tập thể mang tư duy chủ động và nhạy bén, luôn nhìn thấy cơ hội trong thách thức và tiên phong trong hành động. Họ là những người nhạy bén với vấn đề, nhanh chóng nhận diện và đưa ra những giải pháp thực tiễn, mang lại giá trị rõ rệt cho dự án, khách hàng hoặc tổ chức. Với tư duy kiến tạo và tinh thần “Creator” đặc trưng của Sun*, họ không chỉ phản ứng tích cực trước sự thay đổi mà còn chủ động tạo ra cải tiến, góp phần định hình chuẩn mực mới cho cách mà người Sun* tạo giá trị.",
    ],
    alignLeft: true,
    quantity: { value: "01", unit: "Cá nhân hoặc tập thể" },
    prizes: [
      { value: "5.000.000 VNĐ", note: "cho giải cá nhân" },
      { value: "8.000.000 VNĐ", note: "cho giải tập thể" },
    ],
  },
  {
    slug: "mvp",
    navLabel: "MVP",
    title: "MVP (Most Valuable Person)",
    paragraphs: [
      "Giải thưởng MVP vinh danh cá nhân xuất sắc nhất năm – gương mặt tiêu biểu đại diện cho toàn bộ tập thể Sun*. Họ là người đã thể hiện năng lực vượt trội, tinh thần cống hiến bền bỉ, và tầm ảnh hưởng sâu rộng, để lại dấu ấn mạnh mẽ trong hành trình của Sun* suốt năm qua.",
      "Không chỉ nổi bật bởi hiệu suất và kết quả công việc, họ còn là nguồn cảm hứng lan tỏa – thông qua suy nghĩ, hành động và ảnh hưởng tích cực của mình đối với tập thể. MVP là người hội tụ đầy đủ phẩm chất của người Sun* ưu tú, đồng thời mang trên mình trọng trách lớn lao: trở thành hình mẫu đại diện cho con người và tinh thần Sun*, góp phần dẫn dắt tập thể vươn tới những đỉnh cao mới.",
    ],
    quantity: { value: "01", unit: "Cá nhân" },
    prizes: [{ value: "15.000.000 VNĐ" }],
  },
];

export const AWARD_NAV_ITEMS = AWARD_SECTIONS.map(({ slug, navLabel }) => ({ slug, label: navLabel }));
