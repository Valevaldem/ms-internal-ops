"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function toggleCertificateStatusAction(orderId: string, field: "certificateVinylReady" | "certificatePrintedReady" | "certificatePhotoReady") {
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { [field]: true }
    });

    if (!order) {
        return { error: "Orden no encontrada." };
    }

    try {
        await prisma.order.update({
            where: { id: orderId },
            data: {
                [field]: !order[field]
            }
        });

        revalidatePath("/certificados");
        return { success: true };
    } catch (err) {
        console.error("Error toggling certificate status", err);
        return { error: "Ocurrió un error al actualizar la base de datos." };
    }
}

export async function markReviewCompletedAction(orderId: string) {
    try {
        await prisma.order.update({
            where: { id: orderId },
            data: {
                certificateNeedsReview: false
            }
        });

        revalidatePath("/certificados");
        return { success: true };
    } catch (err) {
        console.error("Error marking review completed", err);
        return { error: "Ocurrió un error al actualizar la base de datos." };
    }
}
