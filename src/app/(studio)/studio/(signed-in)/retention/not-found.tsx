import Link from 'next/link';
import {textLink} from '../../_components/ui';
export default function NotFound(){return <main className="container space-y-4 py-10"><h1 className="text-2xl font-bold">Retention record not found</h1><p>This record may have been removed or its preview or receipt may have expired.</p><Link className={textLink} href="/studio/retention">Back to retention</Link></main>;}
