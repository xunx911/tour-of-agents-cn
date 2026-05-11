"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CertificatePageProps {
  name: string;
}

function certPath(name: string) {
  return `/certificate?name=${encodeURIComponent(name)}`;
}

export function CertificatePage({ name }: CertificatePageProps) {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full space-y-8">
        <div className="rounded-lg border border-border overflow-hidden shadow-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/og/certificate?name=${encodeURIComponent(name)}`}
            alt={`${name} 的课程完成证书`}
            className="w-full"
          />
        </div>

        <div className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            你已经完成全部课程，可以保存这个证书链接。
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Button
              variant="outline"
              onClick={() => {
                const url = new URL(certPath(name), window.location.origin).toString();
                navigator.clipboard.writeText(url);
                toast.success("证书链接已复制");
              }}
            >
              复制链接
            </Button>
          </div>

          <p className="text-xs text-muted-foreground pt-4">
            已完成{" "}
            <Link href="/" className="underline underline-offset-2 hover:text-foreground">
              A Tour of Agents
            </Link>
            {" "}的 9 节课程
          </p>
        </div>
      </div>
    </div>
  );
}
