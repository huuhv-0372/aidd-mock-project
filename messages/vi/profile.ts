/*
 * Profile pages (MoMorph 3FoIx6ALVb "Profile bản thân"; w4WUvsJ9KI "Profile người khác" has no MoMorph text, its strings come from the
 * image the owner supplied). VI strings are the design text verbatim; lines marked "not from Figma" have none. `{name}` and
 * `{count}` are filled at render time. The English file mirrors this shape.
 */
export const profile = {
  metaTitleSelf: "Hồ sơ của tôi | SAA 2025", // not from Figma
  metaTitleOther: "{name} | SAA 2025", // not from Figma
  loadError: "Không tải được hồ sơ. Vui lòng thử lại sau.", // not from Figma
  /** Name shown when a profile has no full name. */
  unknownName: "Sunner", // not from Figma
  icons: {
    titleSelf: "Bộ sưu tập icon của tôi", // 3053:10052
    titleOther: "Bộ sưu tập icon của {name}", // owner image: "Bộ sưu tập icon của..." with the name
  },
  /** Other profile: the pill that opens Viết Kudo with this Sunner as recipient (owner image). */
  writeBar: "Gửi lời cám ơn và ghi nhận tới {name}",
  kudos: {
    eyebrow: "Sun* Annual Awards 2025", // 362:5085
    title: "KUDOS", // 362:5088
    received: "Đã nhận ({count})",
    sent: "Đã gửi ({count})", // 186:2760
    sentNoCount: "Đã gửi", // not from Figma: the sent total is unknown
    receivedStatic: "Đã nhận: {count} Kudos", // owner image, other profile
    directionList: "Danh sách Kudo", // not from Figma
    emptySent: "Bạn chưa gửi Kudos nào.", // not from Figma
  },
};
