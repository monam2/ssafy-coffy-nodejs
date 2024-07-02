"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
function fetchMenuList() {
    return __awaiter(this, void 0, void 0, function* () {
        const url = "https://ssafy-cofy.vercel.app/api/order";
        try {
            const response = yield (0, node_fetch_1.default)(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = yield response.json();
            return data;
        }
        catch (error) {
            console.error("Error fetching menu list:", error);
            return [];
        }
    });
}
function sendToMatterMost() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const url = "https://meeting.ssafy.com/hooks/sfiy6wiqejdtjnqifizhycnroc";
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth();
            const day = now.getDate();
            const hours = now.getHours();
            const minutes = now.getMinutes();
            const specificDate = new Date(year, month, day, hours, minutes);
            const options = {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            };
            const formattedDate = specificDate.toLocaleDateString('ko-KO', options);
            const menuList = yield fetchMenuList();
            if (!menuList.length) {
                throw new Error("Failed to fetch menu list");
            }
            let sb = `#### :starmong: [싸피코피 커피 주문 내역] - ${formattedDate}\n`;
            sb += `|   반   |   이름   |   메뉴   |   옵션   |\n`;
            sb += `|:----------:|:-------:|:------------:|:----------:|\n`;
            menuList.forEach(order => {
                order.menus.forEach(menu => {
                    sb += `|     ☕      |  ${order.user}   |     ${menu.menu}      |   ${menu.isHot ? "핫" : "아이스"}    |\n`;
                });
            });
            const requestBody = {
                text: sb,
            };
            const response = yield (0, node_fetch_1.default)(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(requestBody),
            });
            console.log("Response Code:", response.status);
            return response.ok;
        }
        catch (error) {
            console.error(error);
            return false;
        }
    });
}
app.get('/send', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield sendToMatterMost();
    res.send(`Message sent successfully: ${result}`);
}));
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
// 서버 시작 시 자동으로 메시지를 보내기 위해 호출
sendToMatterMost()
    .then((result) => console.log("Initial message sent successfully:", result))
    .catch((error) => console.error("Error sending initial message:", error));
