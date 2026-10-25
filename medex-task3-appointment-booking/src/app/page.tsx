
import { getData } from "@/lib/mock-api";
import BookingExperience from "@/components/BookingExperience";

export default async function Home() {
  const data = await getData();

  return <BookingExperience  />;
}
