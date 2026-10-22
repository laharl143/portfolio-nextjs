'use client';
import {secondaryButton,alertBox} from '../../_components/ui';
export default function ErrorPage(){return <main className="container space-y-5 py-10"><h1 className="text-2xl font-bold">Retention records are unavailable</h1><p role="alert" className={alertBox}>Nothing was removed by loading this page. Please try again.</p><button className={secondaryButton} onClick={()=>window.location.reload()}>Try again</button></main>;}
