import { json } from "@remix-run/node";
import services from "../services.server";

export const loader = async () => {
  //@ts-ignore env.* does not have typings
  const version = import.meta.env.VITE_VERSION;
  try {
    const latestStatus = await services.status();
    const operational = latestStatus.every((e) => e.ok);
    if (operational) {
      return json(
        {
          version: version,
          operational,
        },
        200
      );
    } else {
      return json(
        {
          version: version,
          statuses: latestStatus,
        },
        500
      );
    }
  } catch (e) {
    return json(
      {
        version: version,
        message: "Could not retrieve events from database",
      },
      500
    );
  }
};
