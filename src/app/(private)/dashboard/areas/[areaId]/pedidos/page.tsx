'use client';
import {useParams} from 'next/navigation';
import {AreaOrdersPanel} from '@/components/dashboard/order/AreaOrdersPanel';
export default function Page(){const {areaId}=useParams<{areaId:string}>();return <AreaOrdersPanel areaId={areaId}/>;}
