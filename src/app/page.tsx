import { repo } from '@/lib/data'
import SceneMount from '@/components/scene/SceneMount'
import ScrollController from '@/components/ScrollController'
import { Boot } from '@/components/ui/Boot'
import { BookButton } from '@/components/ui/BookButton'
import { ChapterNav } from '@/components/ui/ChapterNav'
import { Header } from '@/components/ui/Header'
import { Cursor, HoverLabel, ServiceCallout } from '@/components/ui/Overlays'
import {
  DiagnosisChapter,
  FaultChapter,
  MachineChapter,
  ReassemblyChapter,
  ServiceStop,
  TeardownChapter,
} from '@/components/sections/Story'
import { BookChapter, FindUsChapter, ShelfChapter, TrackChapter } from '@/components/sections/Functional'
import { chapters } from '@/content/chapters'

// The page is prerendered; re-read products/services from the repository every 10 minutes
// (matters once src/lib/data points at a real database or CMS).
export const revalidate = 600

export default async function Home() {
  const [products, services] = await Promise.all([repo.products.list(), repo.services.list()])
  // services in the order their stops appear in the timeline
  const order = chapters.flatMap((c) => (c.service ? [c.service.id] : []))
  const stops = order.map((id) => services.find((s) => s.id === id)!).filter(Boolean)

  return (
    <>
      <Boot />
      <SceneMount />
      <Header />
      <ChapterNav />
      <ServiceCallout />
      <HoverLabel />
      <main id="main" className="relative z-[1]">
        <MachineChapter />
        <FaultChapter />
        <TeardownChapter services={stops} />
        {stops.map((s, i) => (
          <ServiceStop key={s.id} service={s} index={i} total={stops.length} />
        ))}
        <DiagnosisChapter />
        <ReassemblyChapter />
        <ShelfChapter products={products} />
        <TrackChapter />
        <BookChapter />
        <FindUsChapter />
      </main>
      <BookButton />
      <Cursor />
      <ScrollController />
    </>
  )
}
