import { API_BASE } from "@/utils/constants";
import { baseHeaders } from "@/utils/request";

const UserSchedule = {
  list: async function () {
    const { slots } = await fetch(`${API_BASE}/user/schedule`, {
      method: "GET",
      headers: baseHeaders(),
    })
      .then((res) => res.json())
      .catch(() => ({ slots: [] }));
    return slots || [];
  },
  add: async function (payload) {
    return await fetch(`${API_BASE}/user/schedule/slots`, {
      method: "POST",
      headers: baseHeaders(),
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .catch((e) => ({ success: false, error: e.message }));
  },
  update: async function (id, payload) {
    return await fetch(
      `${API_BASE}/user/schedule/slots/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        headers: baseHeaders(),
        body: JSON.stringify(payload),
      }
    )
      .then((res) => res.json())
      .catch((e) => ({ success: false, error: e.message }));
  },
  remove: async function (id) {
    return await fetch(
      `${API_BASE}/user/schedule/slots/${encodeURIComponent(id)}`,
      { method: "DELETE", headers: baseHeaders() }
    )
      .then((res) => res.json())
      .catch(() => ({ success: false }));
  },
};

export default UserSchedule;
