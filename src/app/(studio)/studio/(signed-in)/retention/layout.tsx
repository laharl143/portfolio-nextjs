import {requireStudioAccess} from '@/studio/guard';
export const metadata={title:'Data retention · Studio',robots:{index:false,follow:false}};
export const dynamic='force-dynamic';
export const revalidate=0;
export default async function Layout({children}:{children:React.ReactNode}){await requireStudioAccess();return children;}
