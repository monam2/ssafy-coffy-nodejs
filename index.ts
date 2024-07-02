import express, { Request, Response } from "express";
import fetch from "node-fetch";
import cron from "node-cron";

const app = express();
const port = 3000;

interface Menu {
  category: string;
  isWhip: boolean;
  isShot: boolean;
  cartId: number;
  menu: string;
  onlyIce: boolean;
  isSyrup: boolean;
  img: string;
  isPeorl: boolean;
  price: number;
  isHot: boolean;
  isMilk: boolean;
  id: number;
}

interface Order {
  createdAt: {
    seconds: number;
    nanoseconds: number;
  };
  mmId: string;
  orderId: string;
  totalPrice: number;
  classNum: number;
  user: string;
  isPayed: boolean;
  menus: Menu[];
}

interface PickUpMemberDto {
  id: string;
  mmId: string;
  user: string;
  classNum: number;
}

interface MenuStats {
  name: string;
  count: number;
  price: number;
}

async function fetchMenuList(): Promise<Order[]> {
  const url = "https://ssafy-coffy.vercel.app/api/order";
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data as Order[];
  } catch (error) {
    console.error("Error fetching menu list:", error);
    return [];
  }
}

function generateStats(menuList: Menu[]): {
  summary: MenuStats[];
  totalCount: number;
  totalPrice: number;
} {
  const menuStats: { [key: string]: MenuStats } = {};
  let totalCount = 0;
  let totalPrice = 0;

  menuList.forEach((menu) => {
    const options = [
      menu.isShot ? "샷" : "",
      menu.isWhip ? "휘핑" : "",
      menu.isSyrup ? "시럽" : "",
      menu.isMilk ? "우유" : "",
      menu.isPeorl ? "펄" : "",
    ]
      .filter(Boolean)
      .join(", ");

    const menuKey = `${menu.menu}${options ? ` (${options})` : ""}`;

    if (!menuStats[menuKey]) {
      menuStats[menuKey] = {
        name: menuKey,
        count: 0,
        price: 0,
      };
    }

    menuStats[menuKey].count += 1;
    menuStats[menuKey].price += menu.price;
    totalCount += 1;
    totalPrice += menu.price;
  });

  const summary = Object.values(menuStats).sort(
    (a, b) => -b.name.localeCompare(a.name)
  );

  return {
    summary,
    totalCount,
    totalPrice,
  };
}

async function sendToMatterMost(): Promise<boolean> {
  try {
    const matterMostUrl: string = "https://meeting.ssafy.com/hooks/sfiy6wiqejdtjnqifizhycnroc";

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    const specificDate = new Date(year, month, day, hours, minutes);
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    const formattedDate = specificDate.toLocaleDateString("ko-KO", options);

    const menuList = await fetchMenuList();
    if (!menuList.length) {
      throw new Error("Failed to fetch menu list");
    }

    const pickUpMember: PickUpMemberDto[] = [];
    const allMenus: Menu[] = [];
    let orderTable = `|   반   |   이름   |   메뉴   |   옵션   |   가격   |\n`;
    orderTable += `|:----------:|:-------:|:------------|:----------|:----------:|\n`;

    menuList.forEach((order) => {
      let firstOrder = true;
      order.menus.forEach((menu) => {
        const options = [
          menu.isShot ? "샷" : "",
          menu.isWhip ? "휘핑" : "",
          menu.isSyrup ? "시럽" : "",
          menu.isMilk ? "우유" : "",
          menu.isPeorl ? "펄" : "",
        ]
          .filter(Boolean)
          .join(", ");
        orderTable += `|     ${order.classNum}      |  ${
          firstOrder ? order.user + " (" + order.mmId.slice(0, 3) + "**)" : "└"
        }   |   ${menu.isHot ? "핫" : "아이스"}  ${
          menu.menu
        }      |   ${options}    |   ${menu.price.toLocaleString()}    |\n`;
        const student: PickUpMemberDto = {
          id: order.orderId,
          mmId: order.mmId,
          user: order.user,
          classNum: order.classNum,
        };
        pickUpMember.push(student);
        allMenus.push(menu);
        firstOrder = false;
      });
    });

    const randomPickUpMembers = selectRandomPickUpMembers(pickUpMember);

    let sb = `\n####  [싸피코피  :th_fire_2:] - ${formattedDate} :starmong:\n`;

    sb += `#### :alert_siren: 오늘의 커피 수령자는? \n`;

    ///////////////////////////////////////////////////////////////////////////
    /**
     * TEST 수정할 것
     */
    const test = true;

    const testId = 'kangcw0107';

    randomPickUpMembers.forEach((member: PickUpMemberDto) => {
      sb += `- **${member.classNum}반 ${member.user}** (@${
        test ? testId : member.mmId
      })\n`;
    });
    sb += `점심 식사 후 1시~1시 10분 사이에 자전거 거치대 앞으로 나가주세요!\n`;
    sb += `\n`;
    sb += `#### :pink_check: 오늘의 주문 내역\n`;
    sb += orderTable;

    const { summary, totalCount, totalPrice } = generateStats(allMenus);

    sb += `\n#### :bar_chart: 주문 통계\n`;
    sb += `| 메뉴 | 갯수 | 금액 |\n`;
    sb += `|:----------:|:-------:|:------------:|\n`;
    summary.forEach((stat) => {
      sb += `| ${stat.name} | ${
        stat.count
      } | ${stat.price.toLocaleString()}원 |\n`;
    });
    sb += `| **총합** | **${totalCount}** | **${totalPrice.toLocaleString()}원** |\n`;

    const requestBody = {
      text: sb,
    };

    const response = await fetch(matterMostUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    console.log("Response Code:", response.status);

    return response.ok;
  } catch (error) {
    console.error(error);
    return false;
  }
}

function selectRandomPickUpMembers(
  members: PickUpMemberDto[]
): PickUpMemberDto[] {
  const selectedMembers: PickUpMemberDto[] = [];
  const remainingMembers = [...members];

  while (selectedMembers.length < 3 && remainingMembers.length > 0) {
    const randomIndex = Math.floor(Math.random() * remainingMembers.length);
    const selectedMember = remainingMembers[randomIndex];

    selectedMembers.push(selectedMember);

    // Remove all members with the same mmId from remainingMembers
    for (let i = remainingMembers.length - 1; i >= 0; i--) {
      if (remainingMembers[i].mmId === selectedMember.mmId) {
        remainingMembers.splice(i, 1);
      }
    }
  }

  return selectedMembers;
}

app.get("/send", async (req: Request, res: Response) => {
  const result = await sendToMatterMost();
  res.send(`Message sent successfully: ${result}`);
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// 서버 시작 시 자동으로 메시지를 보내기 위해 호출
sendToMatterMost()
  .then((result) => console.log("Initial message sent successfully:", result))
  .catch((error) => console.error("Error sending initial message:", error));

/////////////////////////////////////////////////////////////////////////////
/**
 * 시간 설정하기
 */
const alarmHour = 5;
const alarmMinute = 30;

cron.schedule(`${alarmMinute} ${alarmHour} * * *`, () => {
  sendToMatterMost()
    .then((result) =>
      console.log("Scheduled message sent successfully:", result)
    )
    .catch((error) => console.error("Error sending scheduled message:", error));
});
