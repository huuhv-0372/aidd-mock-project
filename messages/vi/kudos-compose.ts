import type { KudosRulesCopy } from "@/components/kudos-compose/kudos-rules-content";
import type { KudosRulesDialogCopy } from "@/components/kudos-compose/kudos-rules-dialog";
import type { WriteKudoCopy } from "@/components/kudos-compose/write-kudo-copy";
import type { WidgetCopy } from "@/components/site-shell/widget-button";

/*
 * Write Kudos: the widget menu (MoMorph Sv7DFwBw1h), the Thể lệ panel (b1Filzi9i6) and the Viết Kudo modal + Add link
 * (ihQ26W78P2 / OyDLDuSGEa). VI is the Figma text verbatim; lines marked "not from Figma" are UI chrome without a design
 * text. Source of every value: plans/261019-1022-write-kudos/reports/track-a-copy-phase-04.md and -05.md.
 */
export type KudosComposeMessages = {
  widget: WidgetCopy;
  rulesDialog: KudosRulesDialogCopy;
  rules: KudosRulesCopy;
  write: WriteKudoCopy;
};

export const kudosCompose: KudosComposeMessages = {
  widget: { rules: "Thể lệ", writeKudo: "Viết KUDOS", close: "Đóng" },
  rulesDialog: { close: "Đóng", writeKudo: "Viết KUDOS" },
  rules: {
    title: "Thể lệ",
    receiverHeading: "NGƯỜI NHẬN KUDOS: HUY HIỆU HERO CHO NHỮNG ẢNH HƯỞNG TÍCH CỰC",
    receiverIntro:
      "Dựa trên số lượng đồng đội gửi trao Kudos, bạn sẽ sở hữu Huy hiệu Hero tương ứng, được hiển thị trực tiếp cạnh tên profile",
    heroes: [
      {
        label: "New Hero",
        range: "Có 1-4 người gửi Kudos cho bạn",
        description: "Hành trình lan tỏa điều tốt đẹp bắt đầu – những lời cảm ơn và ghi nhận đầu tiên đã tìm đến bạn.",
      },
      {
        label: "Rising Hero",
        range: "Có 5-9 người gửi Kudos cho bạn",
        description: "Hình ảnh bạn đang lớn dần trong trái tim đồng đội bằng sự tử tế và cống hiến của mình.",
      },
      {
        label: "Super Hero",
        range: "Có 10–20 người gửi Kudos cho bạn",
        description: "Bạn đã trở thành biểu tượng được tin tưởng và yêu quý, người luôn sẵn sàng hỗ trợ và được nhiều đồng đội nhớ đến.",
      },
      {
        label: "Legend Hero",
        range: "Có hơn 20 người gửi Kudos cho bạn",
        description: "Bạn đã trở thành huyền thoại – người để lại dấu ấn khó quên trong tập thể bằng trái tim và hành động của mình.",
      },
    ],
    senderHeading: "NGƯỜI GỬI KUDOS: SƯU TẬP TRỌN BỘ 6 ICON, NHẬN NGAY PHẦN QUÀ BÍ ẨN",
    senderIntro:
      "Mỗi lời Kudos bạn gửi sẽ được đăng tải trên hệ thống và nhận về những lượt ❤️ từ cộng đồng Sunner. Cứ mỗi 5 lượt ❤️, bạn sẽ được mở 1 Secret Box, với cơ hội nhận về một trong 6 icon độc quyền của SAA.",
    badgeNames: ["REVIVAL", "TOUCH OF LIGHT", "STAY GOLD", "FLOW TO HORIZON", "BEYOND THE BOUNDARY", "ROOT FURTHER"],
    giftNote: "Những Sunner thu thập trọn bộ 6 icon sẽ nhận về một phần quà bí ẩn từ SAA 2025.",
    nationalHeading: "KUDOS QUỐC DÂN",
    nationalBody:
      "5 Kudos nhận về nhiều ❤️ nhất toàn Sun* sẽ chính thức trở thành Kudos Quốc Dân và được trao phần quà đặc biệt từ SAA 2025: Root Further.",
  },
  write: {
    title: "Gửi lời cám ơn và ghi nhận đến đồng đội",
    required: "Không được để trống",
    recipient: {
      label: "Người nhận",
      placeholder: "Tìm kiếm",
      /* not from Figma: */
      listLabel: "Danh sách người nhận",
      noResult: "Không tìm thấy Sunner phù hợp",
      pickFromList: "Hãy chọn người nhận trong danh sách gợi ý",
    },
    kudoTitle: {
      label: "Danh hiệu",
      placeholder: "Dành tặng một danh hiệu cho đồng đội",
      hint: "Ví dụ: Người truyền động lực cho tôi.\nDanh hiệu sẽ hiển thị làm tiêu đề Kudos của bạn.",
    },
    toolbar: {
      bold: "In đậm",
      italic: "In nghiêng",
      strike: "Gạch ngang",
      orderedList: "Danh sách đánh số",
      link: "Chèn liên kết",
      quote: "Trích dẫn",
      standards: "Tiêu chuẩn cộng đồng",
    },
    editor: {
      label: "Nội dung lời cám ơn" /* not from Figma */,
      placeholder: "Hãy gửi gắm lời cám ơn và ghi nhận đến đồng đội tại đây nhé!",
      mentionHint: "Bạn có thể “@ + tên” để nhắc tới đồng nghiệp khác",
      mentionListLabel: "Gợi ý đồng nghiệp" /* not from Figma */,
      /* not from Figma: the screenshot of the edit frame reads "0/1.000", the owner moved the limit to 5.000. {count} = Markdown length */
      counter: "{count}/5.000",
    },
    hashtag: {
      label: "Hashtag",
      add: "+ Hashtag",
      max: "Tối đa 5",
      listLabel: "Danh sách hashtag" /* not from Figma */,
      remove: "Xóa hashtag" /* not from Figma */,
      loadFailed: "Không tải được danh sách hashtag" /* not from Figma */,
      retry: "Thử lại" /* not from Figma */,
    },
    image: { label: "Image", add: "+ Image", max: "Tối đa 5", remove: "Xóa ảnh" },
    anonymous: { label: "Gửi lời cám ơn và ghi nhận ẩn danh", aliasLabel: "Tên ẩn danh" },
    actions: { cancel: "Hủy", send: "Gửi", save: "Lưu" },
    /* Edit mode (MoMorph 419VXmMy6I): the title is the screenshot text; the pencil name is not from Figma. */
    edit: { title: "Chỉnh sửa bài viết của bạn", pencil: "Chỉnh sửa Kudo" },
    success: {
      sent: "Đã gửi lời cám ơn thành công!" /* not from Figma */,
      saved: "Đã lưu thay đổi!" /* not from Figma */,
    },
    errors: {
      imageFormat: "Định dạng file không hợp lệ" /* not from Figma */,
      imageSize: "Ảnh tối đa 5 MB" /* not from Figma */,
      sendFailed: "Không gửi được lời cám ơn, vui lòng thử lại." /* not from Figma */,
      saveFailed: "Không lưu được thay đổi, vui lòng thử lại." /* not from Figma */,
      contentTooLong: "Nội dung tối đa 5000 ký tự" /* not from Figma */,
      invalid: "Giá trị không hợp lệ, vui lòng kiểm tra lại" /* not from Figma */,
    },
    addLink: {
      title: "Thêm đường dẫn",
      textLabel: "Nội dung",
      linkLabel: "URL",
      cancel: "Hủy",
      save: "Lưu",
      errors: {
        required: "Không được để trống",
        textTooLong: "Tối đa 100 ký tự" /* not from Figma */,
        linkTooShort: "Tối thiểu 5 ký tự" /* not from Figma */,
        linkTooLong: "Tối đa 2048 ký tự" /* not from Figma */,
        linkInvalid: "Link không hợp lệ (chỉ nhận http hoặc https)" /* not from Figma */,
      },
    },
  },
};
