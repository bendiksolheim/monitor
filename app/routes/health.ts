import { LoaderFunctionArgs, json } from "@remix-run/node";
import { getLatestStatus } from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const latestStatus = await getLatestStatus();
    const operational = latestStatus.every((e) => e.status === "OK");
    if (operational) {
      return json(
        {
          operational,
        },
        200
      );
    } else {
      return json(
        {
          statuses: latestStatus,
        },
        500
      );
    }
  } catch (e) {
    return json(
      {
        message: "Could not retrieve events from database",
      },
      500
    );
  }
};
