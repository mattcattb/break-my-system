import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/wad/sandbox/$idx')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/wad/sandbox/$idx"!</div>
}
