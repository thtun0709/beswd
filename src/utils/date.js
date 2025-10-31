// convert UTC -> giờ VN
export const convertToVietnamTime = (utcTime) => {
  const date = new Date(utcTime);
  date.setHours(date.getHours() + 7); // UTC +7
  return date.toLocaleString("vi-VN");
};
