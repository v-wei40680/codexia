import { useEffect, useRef, useState } from "react";
import { open } from "@tauri-apps/plugin-shell";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Check, Copy } from "lucide-react";
import { useTranslation } from "react-i18next";

export function DonateSection() {
  const { t } = useTranslation();
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const paymentMethods = [
    {
      label: "USDC (ERC20)",
      key: "usdc",
      address: "0xBE18F2cf09eE294781B98DBB1653f64ed54a911C",
      image: "/usdc-qr.jpeg",
      alt: "USDC QR Code",
    },
    {
      label: "Bitcoin (BTC)",
      key: "btc",
      address: "bc1qg6xyywh76wkz9glf7n5pnt458yczzgk9eykkt9",
      image: "/btc-qr.jpeg",
      alt: "Bitcoin QR Code",
    },
  ];

  const handleCopy = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setCopiedAddress((prev) => (prev === address ? null : prev));
    }, 2000);
  };

  return (
    <div className="h-full">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-base">{t("donationPurpose")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full"
            onClick={() =>
              open(
                "https://buy.polar.sh/polar_cl_4hLxfGGjyEuiyX6zBlVp2HNzygaGJZuPT3AvC2cUzlH",
              )
            }
          >
            Polar Donate
          </Button>
        </CardContent>
      </Card>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-base">Crypto Donation</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {paymentMethods.map((method) => (
            <div className="space-y-2" key={method.key}>
              <div className="font-medium">{method.label}</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 break-all">{method.address}</code>
                <Button
                  variant="secondary"
                  className="flex items-center gap-2"
                  onClick={() => handleCopy(method.address)}
                >
                  {copiedAddress === method.address ? (
                    <Check size={16} />
                  ) : (
                    <Copy size={16} />
                  )}
                </Button>
              </div>
              <img
                src={method.image}
                alt={method.alt}
                className="w-full h-auto max-h-96 rounded-lg object-contain"
                loading="lazy"
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
