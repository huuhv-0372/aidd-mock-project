# EN localizations (VI -> EN)

Source column: **MoMorph** = `list_file_localizations` `en` entry used verbatim (`is_reviewed: false`, fileKey `9ypp4enmFmdK3YAFJLIu6C`);
**self** = no MoMorph entry, translated here and marked `/* not from Figma */` in `messages/en/*`. BTC to review the **self** rows.
VI column = the strings the UI shipped with (kept verbatim in `messages/vi/*`).

## Shell (messages/*/shell.ts)

| Key | VI (current) | EN | Source |
|---|---|---|---|
| nav.about | About SAA 2025 | About SAA 2025 | MoMorph |
| nav.awards | Awards Information | Awards Information | MoMorph |
| nav.kudos / kudos.title | Sun* Kudos | Sun* Kudos | MoMorph |
| footer.standards | Tiêu chuẩn chung | General standards | MoMorph |
| footer.copyright | Bản quyền thuộc về Sun* © 2025 | Copyright © Sun* 2025 | MoMorph |
| kudos.eyebrow | Phong trào ghi nhận | Recognition Movement | MoMorph |
| details | Chi tiết | Details | MoMorph |
| logoAlt | Sun* Annual Awards 2025 | Sun* Annual Awards 2025 | MoMorph |
| kudos.body | ĐIỂM MỚI CỦA SAA 2025 / Hoạt động ghi nhận và cảm ơn đồng nghiệp ... | NEW AT SAA 2025 / The activity of recognizing and thanking colleagues ... | self (no entry for the whole block, nor for the sentences) |
| account.profile | Profile | Profile | MoMorph |
| account.signOut | Sign out | Sign out | self (MoMorph only has "Logout"; the VI string is already English) |
| account.label | Tài khoản | Account | self |
| notifications.label | Thông báo | Notifications | self |
| notifications.empty | Chưa có thông báo | No notifications yet | self |
| loginLink | Đăng nhập | Login | self |
| widgetLabel | Viết Kudos / Thể lệ SAA | Write Kudos / SAA rules | self |
| nav.ariaLabel | Chính | Main | self |
| footer.ariaLabel | Chân trang | Footer | self |
| languageListLabel (new aria-label on the language listbox) | Ngôn ngữ | Language | self |

## Home (messages/*/home.ts, root-further.ts)

| Key | VI (current) | EN | Source |
|---|---|---|---|
| eventInfo.time.label | Thời gian: | Time: | MoMorph |
| eventInfo.venue.label | Địa điểm: | Venue: | MoMorph |
| eventInfo.venue.value | Âu Cơ Art Center | Âu Cơ Art Center | MoMorph |
| eventInfo.broadcast | Tường thuật trực tiếp qua sóng Livestream | Live coverage via Livestream | MoMorph |
| cta.awards / cta.kudos | ABOUT AWARDS / ABOUT KUDOS | ABOUT AWARDS / ABOUT KUDOS | MoMorph |
| awardsSection.eyebrow | Sun* annual awards 2025 | identical | MoMorph casing ("Annual Awards") dropped: proper name stays identical to vi (clarifications) |
| awardsSection.title | Hệ thống giải thưởng | Awards System | MoMorph |
| awardCards.top-talent.description | Vinh danh top cá nhân xuất sắc trên mọi phương diện | Honoring top individuals across all aspects | MoMorph |
| awardCards.top-project.description | Vinh danh dự án xuất sắc trên mọi phương diện, dự án có doanh thu nổi bật | Honoring top projects across all aspects, especially those with outstanding revenue | MoMorph |
| awardCards.top-project-leader.description | Vinh danh người quản lý truyền cảm hứng và dẫn dắt dự án bứt phá, | Honoring inspiring managers who lead innovative project breakthroughs | MoMorph |
| awardCards.best-manager / signature / mvp .description | Vinh danh người quản lý có năng lực quản lý tốt, dẫn dắt đội nhóm | Honoring managers with strong management skills leading their teams | MoMorph |
| awardCards.*.title | Top Talent, Top Project, Top Project Leader, Best Manager, Signature 2025 - Creator, MVP (Most Valuable Person) | identical | MoMorph |
| rootFurther.intro (3 paragraphs) | Đứng trước bối cảnh thay đổi như vũ bão ... | Facing an era of storm-like change ... | self (no entry) |
| rootFurther.quote.line1 | “A tree with deep roots fears no storm” | identical | n/a (already English) |
| rootFurther.quote.line2 | (Cây sâu bén rễ, bão giông chẳng nề - Ngạn ngữ Anh) | (Deep-rooted trees fear no storm - English proverb) | self |
| rootFurther.outro (2 paragraphs) | Trước giông bão, chỉ những tán cây ... | Before a storm, only canopies with strong enough roots ... | self (no entry) |
| COMING_SOON, DAYS / HOURS / MINUTES (kept as constants in components) | Coming soon, DAYS, HOURS, MINUTES | identical | MoMorph (DAYS/HOURS/MINUTES, same text); "Coming soon" has no entry and is English in both |

## Awards information (messages/*/awards.ts, award-sections.ts)

| Key | VI (current) | EN | Source |
|---|---|---|---|
| metaTitle, title | Hệ thống giải thưởng SAA 2025 | SAA 2025 Award System | MoMorph |
| subtitle | Sun* annual awards 2025 | identical | MoMorph casing dropped, as awardsSection.eyebrow; `capitalize` renders it title case |
| keyvisualAlt | Keyvisual Sun* Annual Award 2025 | identical | MoMorph-less, already English |
| navAriaLabel | Danh mục giải thưởng | Award categories | self |
| quantityLabel | Số lượng giải thưởng: | Number of awards: | MoMorph |
| prizeLabel | Giá trị giải thưởng: | Prize value: | MoMorph |
| prizeOr | Hoặc | Or | MoMorph |
| quantityUnit | Cá nhân / Tập thể / Cá nhân hoặc tập thể | Individual / Team / Individual or Team | MoMorph |
| prize notes | cho mỗi giải thưởng / cho giải cá nhân / cho giải tập thể | per prize / for individual award / for team award | MoMorph |
| prize values | 7.000.000 / 15.000.000 / 10.000.000 / 5.000.000 / 8.000.000 VNĐ | 7,000,000 / 15,000,000 / 10,000,000 / 5,000,000 / 8,000,000 VND | MoMorph |
| Top Talent paragraph | Giải thưởng Top Talent vinh danh ... | Top Talent Award recognizing individuals ... | MoMorph |
| Top Project paragraph | Giải thưởng Top Project vinh danh ... | Top Project Award honoring excellent project teams ... | MoMorph |
| Top Project Leader paragraph | Giải thưởng Top Project Leader vinh danh ... | Top Project Leader Award honoring excellent project managers ... | MoMorph |
| Best Manager paragraph | Giải thưởng Best Manager vinh danh ... | Best Manager Award honoring outstanding leaders ... | MoMorph |
| Signature paragraphs (2) | Giải thưởng Signature vinh danh ... / Trong năm 2025 ... | The Signature Award honors ... / In 2025, the Signature Award honors the Creator ... | self (no entry, with either the double-space or newline join) |
| MVP paragraphs (2) | Giải thưởng MVP vinh danh ... / Không chỉ nổi bật ... | The MVP Award honors ... / Beyond standing out ... | self (no entry) |

## Login, countdown, 404

| Key | VI (current) | EN | Source |
|---|---|---|---|
| login.metaTitle | Đăng nhập \| SAA 2025 | Login \| SAA 2025 | self |
| login.introLine1 | Bắt đầu hành trình của bạn cùng SAA 2025. | Start your journey with SAA 2025. | self |
| login.introLine2 | Đăng nhập để khám phá! | Log in to explore! | self |
| login.googleButton | LOGIN With Google | LOGIN With Google | MoMorph |
| login.errorMessage | Đăng nhập không thành công. Vui lòng thử lại. | Login failed. Please try again. | self |
| countdown.title | Sự kiện sẽ bắt đầu sau | The event will start after | MoMorph |
| countdown.metaTitle | SAA 2025 — Sự kiện sẽ bắt đầu sau | SAA 2025 — The event will start after | MoMorph (title part) |
| notFound.metaTitle | Không tìm thấy trang \| SAA 2025 | Page not found \| SAA 2025 | self |
| notFound.title | Không tìm thấy trang | Page not found | self |
| notFound.body | Trang bạn tìm không tồn tại hoặc đã được chuyển đi nơi khác. | The page you are looking for does not exist or has been moved. | self |
| notFound.homeLink | Về trang chủ | Back to home | self |

## Not sourceable from MoMorph (all marked `/* not from Figma */`)

Kudos body; Root Further intro/outro/quote line 2; Signature and MVP paragraphs; every aria-label (nav, footer, account, notifications, widget, awards nav, language list);
guest "Login" link; "Sign out"; the login page copy and error message; the whole 404 page; page titles for login and 404.
MoMorph `vi` entries were deliberately NOT used (clarification: VI = current strings verbatim).
