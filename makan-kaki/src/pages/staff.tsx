import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { Empty, PageTitle, Spinner } from '../components/ui'
import { RedeemCode } from './owner'

export function StaffHome() {
  const { profile } = useAuth()
  const [outlet, setOutlet] = useState<string | null | undefined>(undefined)
  useEffect(() => {
    supabase.rpc('claim_staff_access').then(({ data }) => setOutlet((data as string | null) ?? null))
  }, [])
  if (outlet === undefined) return <Spinner />
  if (outlet === null) {
    return (
      <>
        <PageTitle title="Not linked to an outlet yet" />
        <Empty>
          Ask your outlet owner to add <span className="font-semibold text-brown">{profile?.email}</span> on their Staff page, then reload this page.
        </Empty>
      </>
    )
  }
  return <RedeemCode outletName={outlet} />
}
