import { parse } from "csv-parse/sync";
import dayjs from "dayjs";
import "dayjs/locale/ja";
import { WebClient } from "@slack/web-api";

interface Record {
  Date: string;
  Tokyo: string;
  [key: string]: string;
}

(async () => {
  try {
    console.log("Started.");

    const response = await fetch(
      "https://covid19.mhlw.go.jp/public/opendata/newly_confirmed_cases_daily.csv"
    );

    if (!response.ok) {
      console.log("Fetch failed.");
      process.exit(0);
    }

    const csvText = await response.text();

    const records: Record[] = parse(csvText, { bom: true, columns: true });

    const transformedRecords = records
      .slice()
      .map((r) => ({ ...r, Tokyo: Number(r.Tokyo) }))
      .sort((a, b) => (dayjs(a.Date).isBefore(b.Date) ? 1 : -1));

    const token = process.env.SLACK_TOKEN;
    const channelId = process.env.SLACK_CHANNEL_ID!;
    const web = new WebClient(token);

    const latestRecord = transformedRecords[0];
    const dateText = dayjs(latestRecord.Date)
      .locale("ja")
      .format("YYYY/MM/DD(ddd)");
    const casesCount = latestRecord.Tokyo.toLocaleString("ja-JP");
    const message = `${dateText}の東京都の新たな感染者数: *${casesCount}* 人`;

    await web.chat.postMessage({ channel: channelId, text: message });

    console.log("Notification succeeded.");
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
})();
