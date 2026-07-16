import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/wad/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/wad/"!</div>
}
