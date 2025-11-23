import { useEffect, useRef, useState } from "react";
import { open } from "@tauri-apps/plugin-shell";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "../ui/card";
import { Check, Copy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

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

  const payment = {
    usdc: "0xBE18F2cf09eE294781B98DBB1653f64ed54a911C",
    btc: "bc1qg6xyywh76wkz9glf7n5pnt458yczzgk9eykkt9",
  };

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
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-base">
            Login to access full context session history
          </CardTitle>
        </CardHeader>
        <CardContent>
          includes tool call, Plan Messages, diff, patch, Execution Commands
        </CardContent>
        <CardFooter>
          <Link to="/login" className="w-full">
            <Button className="w-full">Login</Button>
          </Link>
        </CardFooter>
      </Card>
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
        <CardContent className="space-y-4 grid grid-cols-2 gap-2">
          {/* USDC */}
          <div className="space-y-2">
            <div className="font-medium">USDC (ERC20)</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all">{payment.usdc}</code>
              <Button
                variant="secondary"
                className="flex items-center gap-2"
                onClick={() =>
                  handleCopy(payment.usdc)
                }
              >
                {copiedAddress === payment.usdc ? (
                  <Check size={16} />
                ) : (
                  <Copy size={16} />
                )}
              </Button>
            </div>
            <img src="/usdc-qr.jpeg" alt="USDC QR Code" />
          </div>
          {/* Bitcoin */}
          <div className="space-y-2">
            <div className="font-medium">Bitcoin (BTC)</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all">{payment.btc}</code>
              <Button
                variant="secondary"
                className="flex items-center gap-2"
                onClick={() =>
                  handleCopy(payment.btc)
                }
              >
                {copiedAddress === payment.btc ? (
                  <Check size={16} />
                ) : (
                  <Copy size={16} />
                )}
              </Button>
            </div>
            <img src="/btc-qr.jpeg" alt="Bitcoin QR Code" />
          </div>
        </CardContent>
      </Card>
    </>
  );
}
