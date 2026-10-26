/*
 * Sun* Kudos Live board (MoMorph MaZUn5xHXZ): VI strings are the Figma text verbatim; lines marked
 * "not from Figma" have no design text. The English file mirrors this shape.
 */
const eyebrow = "Sun* Annual Awards 2025"; // 2940:13454 / 2940:13477 / 2940:14221
const empty = "Hiện tại chưa có Kudos nào.";

const card = {
  person: {
    anonymous: "Ẩn danh",
    heroTips: {
      new: {
        label: "New Hero",
        headline: "Có 1–4 người gửi Kudos cho bạn",
        body: "Hành trình lan tỏa điều tốt đẹp bắt đầu – những lời cảm ơn và ghi nhận đầu tiên đã tìm đến bạn.",
      },
      rising: {
        label: "Rising Hero",
        headline: "Có 5-9 người gửi Kudos cho bạn",
        body: "Hình ảnh bạn đang lớn dần trong trái tim đồng đội bằng sự tử tế và cống hiến của mình.",
      },
      super: {
        label: "Super Hero",
        headline: "Có 10–20 người gửi Kudos cho bạn",
        body: "Bạn đã trở thành biểu tượng được tin tưởng và yêu quý, người luôn sẵn sàng hỗ trợ và được nhiều đồng đội nhớ đến.",
      },
      legend: {
        label: "Legend Hero",
        headline: "Có hơn 20 người gửi Kudos cho bạn",
        body: "Bạn đã trở thành huyền thoại – người để lại dấu ấn khó quên trong tập thể bằng trái tim và hành động của mình.",
      },
    },
    starTips: [
      "Sunner đã nhận được 10 Kudos và bắt đầu lan tỏa năng lượng ấm áp đến mọi người xung quanh.",
      "Sunner đã nhận được 20 Kudos và chứng minh sức ảnh hưởng của mình qua những hành động lan tỏa tích cực mỗi ngày.",
      "Sunner đã nhận được 50 Kudos và trở thành hình mẫu của sự công nhận, sẻ chia và lan tỏa tinh thần Sun*.",
    ] as [string, string, string], // one tip per star tier (10 / 20 / 50 Kudos)
  },
  hearts: { label: "{count} lượt thả tim", error: /* not from Figma */ "Không thả tim được, hãy thử lại." },
  copyLink: { label: "Copy Link", toast: "Link copied — ready to share!" },
};

/* Feed card copy (All Kudos); the detail page (Figma 520:18779) shows the same card plus its "Đóng" button. */
const postCard = {
  ...card,
  gallery: {
    openImage: "Xem ảnh {index}/{total}", // not from Figma
    imageAlt: "Ảnh đính kèm", // not from Figma
    closeImage: "Đóng ảnh", // not from Figma
  },
};
const close = "Đóng"; // 520:18779

export const kudos = {
  metaTitle: "Sun* Kudos | SAA 2025",
  kv: {
    title: "Hệ thống ghi nhận và cảm ơn", // 2940:13439
    logoAlt: "KUDOS",
  },
  compose: {
    placeholder: "Hôm nay, bạn muốn gửi lời cảm ơn và ghi nhận đến ai?",
    searchPlaceholder: "Tìm kiếm profile Sunner",
    searchSubmitLabel: /* not from Figma */ "Tìm kiếm",
    searchListLabel: /* not from Figma */ "Kết quả tìm kiếm Sunner",
    searchNoResult: /* not from Figma */ "Không tìm thấy Sunner nào.",
    searchError: /* not from Figma */ "Không tìm kiếm được, hãy thử lại.",
  },
  highlight: {
    eyebrow,
    title: "HIGHLIGHT KUDOS",
    empty,
    filters: {
      hashtag: "Hashtag",
      department: "Phòng ban",
      hashtagList: "Danh sách hashtag", // not from Figma
      departmentList: "Danh sách phòng ban", // not from Figma
    },
    carousel: {
      regionLabel: "Highlight Kudos", // not from Figma
      prev: "Kudo trước", // not from Figma
      next: "Kudo sau", // not from Figma
      slidePrev: "Slide trước", // not from Figma
      slideNext: "Slide sau", // not from Figma
    },
    card: { viewDetails: "Xem chi tiết", ...card },
    error: "Không tải được Highlight Kudos.", // not from Figma
  },
  spotlight: {
    eyebrow, // 2940:13477
    title: "SPOTLIGHT BOARD", // 2940:13480
    unit: "KUDOS", // 3007:17482 ("388 KUDOS")
    searchLabel: "Tìm kiếm", // 2940:14833
    panZoomLabel: "Pan/Zoom", // 3007:17479 (spec B.7.2 tooltip)
    empty, // same empty-state wording as the feed (clarifications)
    noResults: "Không tìm thấy Sunner nào.", // not from Figma
    loadError: "Không thể tải Spotlight Board.", // not from Figma
    tickerSuffix: "đã nhận được một Kudos mới", // 2940:14230
    unknownName: "Sunner", // not from Figma
  },
  allKudos: {
    eyebrow,
    title: "ALL KUDOS",
    empty,
    error: "Không tải được danh sách Kudos. Vui lòng thử lại sau.", // not from Figma
    feed: {
      loading: "Đang tải thêm Kudos...", // not from Figma
      end: "Bạn đã xem hết Kudos.", // not from Figma
      error: "Không tải thêm được Kudos.", // not from Figma
      retry: "Thử lại", // not from Figma
    },
    card: postCard,
    stats: {
      labels: [
        "Số Kudos bạn nhận được:",
        "Số Kudos bạn đã gửi:",
        "Số tim bạn nhận được:",
        "Số Secret Box bạn đã mở:",
        "Số Secret Box chưa mở:",
      ] as [string, string, string, string, string], // order of the five sidebar rows
      openBox: "Mở Secret Box",
      error: "Không tải được thống kê.", // not from Figma
    },
    gifts: {
      title: "10 SUNNER NHẬN QUÀ\nMỚI NHẤT",
      empty: "Chưa có dữ liệu",
      receivedPrefix: "Nhận được",
      listLabel: "Danh sách Sunner nhận quà", // not from Figma
      error: "Không tải được danh sách nhận quà.", // not from Figma
    },
  },
  detail: {
    metaTitle: /* not from Figma */ "Chi tiết Kudo | SAA 2025",
    close,
    loadError: /* not from Figma */ "Không tải được Kudo. Vui lòng thử lại sau.",
    card: { ...postCard, close },
  },
};
