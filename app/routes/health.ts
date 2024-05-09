import { json } from "@remix-run/node";
import events from "~/events";

export const loader = async () => {
  try {
    const latestStatus = await events.latestStatus();
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
