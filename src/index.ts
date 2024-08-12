import DataBase from "./database";
import Scheduler from "./scheduler";

function getFontData(ids: string[]): Promise<FontItem[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(
        ids.map((id) => ({
          font_id: id,
          font_name: `font-${id}`,
          update_time: Date.now(),
        }))
      );
    }, 1000);
  });
}

interface DataItem {
  id: string;
  revalidate: number;
  data: FontItem;
}

interface FontItem {
  font_id: string;
  font_name: string;
  update_time: number;
}

const scheduler = new Scheduler<string>();
const db = new DataBase<DataItem>();

scheduler.listen(async (tasks) => {
  tasks.map(async (task) => {});

  const fonts = await getFontData(tasks.map((i) => i.query));
  scheduler.commits(
    tasks.map((i, index) => ({ symbol: i.symbol, result: fonts[index] }))
  );
});
